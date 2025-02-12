const path = require("path");
const {
  listObjects,
  findObjectByFileId,
  uploadToMinio,
} = require("../utils/helpers");
const { minioClient, bucketName } = require("../utils/minioClientSetup");
const {
  validateBase64Upload,
  validateQueryParams,
  validateFileUpload,
} = require("../utils/validators");

const getFiles = async (req, res) => {
  try {
    const {
      keyword,
      prefix = "",
      limit = 10,
      marker = "",
      startDate,
      endDate,
      sortBy = "lastModified", // default sort field
      sortOrder = "desc", // default sort order
    } = req.query;

    // Validate query parameters
    const validationErrors = validateQueryParams(req.query);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: validationErrors,
      });
    }

    // Get files list with a larger limit for filtering
    const parsedLimit = parseInt(limit, 10);
    const files = await listObjects(
      prefix,
      keyword || startDate || endDate ? parsedLimit * 2 : parsedLimit,
      marker
    );

    // Apply filters if any filter parameter is provided
    let filteredFiles = files;
    if (keyword || startDate || endDate) {
      filteredFiles = files.filter((file) => {
        let matches = true;

        // Keyword filter
        if (keyword) {
          const searchString =
            `${file.objectName} ${file.category}`.toLowerCase();
          matches = matches && searchString.includes(keyword.toLowerCase());
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
    }

    // Sort files
    filteredFiles.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "filename":
          comparison = a.filename.localeCompare(b.filename);
          break;
        case "size":
          comparison = a.size - b.size;
          break;
        case "category":
          comparison = a.category.localeCompare(b.category);
          break;
        case "lastModified":
        default:
          comparison = new Date(a.lastModified) - new Date(b.lastModified);
          break;
      }
      return sortOrder === "desc" ? -comparison : comparison;
    });

    // Apply pagination
    const paginatedFiles = filteredFiles.slice(0, parsedLimit);

    // Prepare response
    const response = {
      files: paginatedFiles,
      nextMarker:
        paginatedFiles.length === parsedLimit
          ? paginatedFiles[paginatedFiles.length - 1].objectName
          : null,
      hasMore: paginatedFiles.length === parsedLimit,
      totalFound: filteredFiles.length,
      query: {
        keyword,
        startDate,
        endDate,
        prefix,
        limit: parsedLimit,
        sortBy,
        sortOrder,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error processing files request: ", error);
    res.status(500).json({
      error: "Error processing files request",
      message: error.message,
    });
  }
};

const getFileById = async (req, res) => {
  try {
    const { fileId } = req.params;
    const obj = await findObjectByFileId(fileId);

    if (!obj) {
      return res.status(404).send("File not found");
    }

    const stream = await minioClient.getObject(bucketName, obj.name);

    // Set appropriate headers
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${path.basename(obj.name)}"`
    );

    stream.pipe(res);
  } catch (error) {
    console.error("Error fetching file: ", error);
    res.status(500).send("Error reading file: " + error.message);
  }
};

const deleteFileById = async (req, res) => {
  try {
    const { fileId } = req.params;
    const obj = await findObjectByFileId(fileId);

    if (!obj) {
      return res.status(404).send("File not found");
    }

    await minioClient.removeObject(bucketName, obj.name);
    res.json({
      message: "File deleted successfully.",
      fileId,
      objectName: obj.name,
    });
  } catch (error) {
    console.error("Error deleting file: ", error);
    res.status(500).send("Error deleting file: " + error.message);
  }
};

const uploadFile = async (req, res) => {
  try {
    const { category } = req.body;
    const file = req.file;

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
      category
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
    const { files, category } = req.body;

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
            category
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
    const { category } = req.body;
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
            category
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
