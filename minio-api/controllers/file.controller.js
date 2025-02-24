const { listObjects, uploadToMinio } = require("../utils/helpers");
const { minioClient } = require("../utils/minioClientSetup");
const {
  validateBase64Upload,
  validateFileUpload,
} = require("../utils/validators");

const getFiles = async (req, res) => {
  try {
    const { bucketName } = req.params;
    const { keyword, limit = 10, marker = "", startDate, endDate } = req.query;

    if (!bucketName) {
      return res.status(400).json({ error: "Bucket name is required" });
    }

    const normalizedBucketName = bucketName.toLowerCase();
    const parsedLimit = parseInt(limit, 10);

    // Fetch objects from Minio
    const files = await listObjects(normalizedBucketName, parsedLimit, marker);

    // Apply filtering based on fileId, date range, etc.
    let filteredFiles = files.filter((file) => {
      let matches = true;

      // Keyword filter (matching fileId)
      if (keyword) {
        matches = file.fileId.includes(keyword);
      }

      // Date range filter
      if (matches && (startDate || endDate)) {
        const fileDate = new Date(file.lastModified);

        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          matches = matches && fileDate >= start;
        }

        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          matches = matches && fileDate <= end;
        }
      }

      return matches;
    });

    // Apply pagination
    const paginatedFiles = filteredFiles.slice(0, parsedLimit);

    // Prepare response
    res.json({
      files: paginatedFiles,
      nextMarker:
        paginatedFiles.length === parsedLimit
          ? paginatedFiles[paginatedFiles.length - 1].fileId
          : null,
      hasMore: paginatedFiles.length === parsedLimit,
      totalFound: filteredFiles.length,
      query: {
        keyword,
        startDate,
        endDate,
        bucketName,
        limit: parsedLimit,
      },
    });
  } catch (error) {
    console.error("Error fetching files:", error);
    res
      .status(500)
      .json({ error: "Error fetching files", message: error.message });
  }
};

const getFileById = async (req, res) => {
  try {
    const { fileId, bucketName } = req.params;

    if (!bucketName || !fileId) {
      return res
        .status(400)
        .json({ error: "Bucket name and file ID is required" });
    }

    const normalizedBucketName = bucketName.toLowerCase();
    const stream = await minioClient.getObject(normalizedBucketName, fileId);

    // Set appropriate headers
    res.setHeader("Content-Type", "application/octet-stream");
    stream.pipe(res);
  } catch (error) {
    console.error("Error fetching file: ", error);

    if (error?.code && error.code.toLowerCase() === "nosuchkey") {
      res.status(404).json({ error: "File not found" });
    } else {
      res
        .status(500)
        .json({ error: "Error fetching file", message: error.message });
    }
  }
};

const deleteFileById = async (req, res) => {
  try {
    const { fileId, bucketName } = req.params;

    if (!bucketName || !fileId) {
      return res
        .status(400)
        .json({ error: "Bucket name and file ID is required" });
    }
    const normalizedBucketName = bucketName.toLowerCase();

    await minioClient.removeObject(normalizedBucketName, fileId);

    res.json({
      message: "File deleted successfully.",
      fileId,
      bucketName: normalizedBucketName,
    });
  } catch (error) {
    console.error("Error deleting file: ", error);

    if (error?.code && error.code.toLowerCase === "nosuchkey") {
      res.status(404).json({ error: "File not found" });
    } else {
      res.status(500).json({
        error: "Error deleting file",
        message: error.message,
      });
    }
  }
};

const uploadFile = async (req, res) => {
  try {
    const { bucketName } = req.body;
    const file = req.file;

    if (!bucketName) {
      return res.status(400).json({ error: "Bucket name is required" });
    }

    const validationErrors = validateFileUpload(file);
    if (validationErrors.length > 0) {
      return res.status(400).json({ errors: validationErrors });
    }

    const result = await uploadToMinio(
      {
        buffer: file.buffer,
        filename: file.originalname,
        mimetype: file.mimetype,
      },
      bucketName
    );

    res.status(201).json({
      message: "File uploaded successfully.",
      ...result,
    });
  } catch (error) {
    console.error("Error uploading file: ", error);
    res.status(500).json({
      error: "Error uploading file",
      message: error.message,
    });
  }
};

const uploadBase64Files = async (req, res) => {
  try {
    const { files, bucketName } = req.body;

    if (!bucketName) {
      return res.status(400).json({ error: "Bucket name is required" });
    }

    if (!Array.isArray(files)) {
      return res
        .status(400)
        .json({ error: "Files must be an array of base64 data" });
    }

    const results = [];
    const errors = [];

    // Process each base64 file
    await Promise.all(
      files.map(async (fileData) => {
        try {
          const validationErrors = validateBase64Upload(fileData);
          if (validationErrors.length > 0) {
            errors.push({
              filename: fileData.filename,
              errors: validationErrors,
            });
            return;
          }

          const buffer = Buffer.from(fileData.content, "base64");
          const mimetype = fileData.mimetype || "application/octet-stream";

          const result = await uploadToMinio(
            {
              buffer,
              filename: fileData.filename,
              mimetype,
            },
            bucketName
          );

          results.push({
            originalname: fileData.filename,
            ...result,
          });
        } catch (error) {
          errors.push({
            filename: fileData.filename,
            error: error.message,
          });
        }
      })
    );

    res.status(201).json({
      message: `Uploaded ${results.length} files successfully${
        errors.length > 0 ? ` with ${errors.length} errors` : ""
      }`,
      successful: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error uploading base64 files: ", error);
    res.status(500).json({
      error: "Error uploading base64 files",
      message: error.message,
    });
  }
};

const uploadMultipleFiles = async (req, res) => {
  try {
    const { bucketName } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files provided" });
    }

    const results = [];
    const errors = [];

    // Process each file
    await Promise.all(
      files.map(async (file) => {
        try {
          const validationErrors = validateFileUpload(file);
          if (validationErrors.length > 0) {
            errors.push({
              filename: file.originalname,
              errors: validationErrors,
            });
            return;
          }

          const result = await uploadToMinio(
            {
              buffer: file.buffer,
              filename: file.originalname,
              mimetype: file.mimetype,
            },
            bucketName
          );

          results.push({
            originalname: file.originalname,
            ...result,
          });
        } catch (error) {
          errors.push({
            filename: file.originalname,
            error: error.message,
          });
        }
      })
    );

    res.status(201).json({
      message: `Uploaded ${results.length} files successfully${
        errors.length > 0 ? ` with ${errors.length} errors` : ""
      }`,
      successful: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error uploading files: ", error);
    res.status(500).json({
      error: "Error uploading files",
      message: error.message,
    });
  }
};

module.exports = {
  getFiles,
  getFileById,
  deleteFileById,
  uploadFile,
  uploadMultipleFiles,
  uploadBase64Files,
};
