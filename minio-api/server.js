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

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// MinIO Client Setup
require("./utils/minioClientSetup");

// Multer Setup
const storage = multer.memoryStorage();
const upload = multer({ storage });

// File Upload API'S
app.post("/upload", upload.single("file"), uploadFile);
app.post("/upload/multiple", upload.array("files", 10), uploadMultipleFiles); // limit to 10 files
app.post("/upload/base64", uploadBase64Files);

// List Files with pagination and Search Filters
app.get("/:bucketName/files", getFiles);

// Read File by fileId
app.get("/:bucketName/file/:fileId", getFileById);

// Delete File by fileId
app.delete("/:bucketName/file/:fileId", deleteFileById);

// Not Found Route
app.use((req, res) => {
  res.status(404).send("API Not Found");
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});