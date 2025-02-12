require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const {
  getFiles,
  getFileById,
  uploadFile,
  deleteFileById,
  uploadMultipleFiles,
  uploadBase64Files,
} = require("./controllers/file.controller");
const { minioClient, bucketName } = require("./utils/minioClientSetup");

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MinIO Client Setup
require("./utils/minioClientSetup");

// Helper function to ensure bucket exists
async function ensureBucketExists() {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, "eu-central-1");
      console.log(`Bucket "${bucketName}" created successfully.`);
    }
  } catch (err) {
    console.error("Error ensuring bucket exists:", err.message);
    throw err;
  }
}

// Multer Setup
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Initialize bucket
ensureBucketExists().catch(console.error);

// File Upload API'S
app.post("/upload", upload.single("file"), uploadFile);
app.post("/upload/multiple", upload.array("files", 10), uploadMultipleFiles); // limit to 10 files
app.post("/upload/base64", uploadBase64Files);

// List Files with pagination and Search Filters
app.get("/files", getFiles);

// Read File by fileId
app.get("/file/:fileId", getFileById);

// Delete File by fileId
app.delete("/file/:fileId", deleteFileById);

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});