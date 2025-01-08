require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");
const Minio = require("minio");
const path = require("path");

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MinIO Client Setup
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: parseInt(process.env.MINIO_PORT, 10),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

const bucketName = process.env.MINIO_BUCKET;

// Ensure Bucket Exists
(async () => {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, "us-east-1");
      console.log(`Bucket "${bucketName}" created successfully.`);
    }
  } catch (err) {
    console.error("Error ensuring bucket exists:", err.message);
  }
})();

// Multer Setup
const storage = multer.memoryStorage();
const upload = multer({ storage });

// File Upload API
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { category } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).send("No file provided.");
    }

    const fileId = uuidv4();
    const objectName = `${category || "default"}/${fileId}-${
      file.originalname
    }`;

    await minioClient.putObject(
      bucketName,
      objectName,
      file.buffer,
      file.size,
      {
        "Content-Type": file.mimetype,
      }
    );

    res
      .status(201)
      .send({ message: "File uploaded successfully.", fileId, objectName });
  } catch (error) {
    res.status(500).send("Error uploading file: " + error.message);
  }
});

// List Files API
app.get("/files", async (req, res) => {
  try {
    const { prefix = "", limit = 10 } = req.query;
    const files = [];
    const stream = minioClient.listObjectsV2(bucketName, prefix, true);

    let count = 0;
    stream.on("data", (obj) => {
      if (count < limit) {
        files.push({
          name: obj.name,
          size: obj.size,
          lastModified: obj.lastModified,
          etag: obj.etag,
        });
        count++;
      }
    });

    stream.on("end", () => {
      res.send(files);
    });

    stream.on("error", (err) => {
      res.status(500).send("Error listing files: " + err.message);
    });
  } catch (error) {
    res.status(500).send("Error fetching files: " + error.message);
  }
});

// Search Files API
app.get("/files/search", async (req, res) => {
  try {
    const { keyword, prefix = "" } = req.query;
    if (!keyword) {
      return res.status(400).send("Keyword is required.");
    }

    const files = [];
    const stream = minioClient.listObjectsV2(bucketName, prefix, true);

    stream.on("data", (obj) => {
      if (obj.name.includes(keyword)) {
        files.push({
          name: obj.name,
          size: obj.size,
          lastModified: obj.lastModified,
          etag: obj.etag,
        });
      }
    });

    stream.on("end", () => {
      res.send(files);
    });

    stream.on("error", (err) => {
      res.status(500).send("Error searching files: " + err.message);
    });
  } catch (error) {
    res.status(500).send("Error searching files: " + error.message);
  }
});

// Read File API
app.get("/file/*", async (req, res) => {
  try {
    // const { objectName } = req.params;
    const objectName = req.params[0];

    minioClient.getObject(bucketName, objectName, (err, stream) => {
      if (err) {
        return res.status(404).send("File not found.");
      }

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${path.basename(objectName)}"`
      );
      stream.pipe(res);
    });
  } catch (error) {
    res.status(500).send("Error reading file: " + error.message);
  }
});

// Delete File API
app.delete("/file/*", async (req, res) => {
  try {
    // const { objectName } = req.params;
    // * for complex file path names (/test/myfile.png)
    
    const objectName = req.params[0];

    await minioClient.removeObject(bucketName, objectName);
    res.send({ message: "File deleted successfully." });
  } catch (error) {
    res.status(500).send("Error deleting file: " + error.message);
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
