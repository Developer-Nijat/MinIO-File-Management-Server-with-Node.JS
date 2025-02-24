const { v4: uuidv4 } = require("uuid");
const {
  minioClient,
  bucketName,
  ensureBucketExists,
} = require("./minioClientSetup");

async function listObjects(bucketName, limit = 10, marker = "") {
  const stream = minioClient.listObjects(bucketName, "", true);
  const files = [];
  let count = 0;
  let startFromMarker = !marker;

  return new Promise((resolve, reject) => {
    stream.on("data", (obj) => {
      if (!startFromMarker) {
        if (obj.name === marker) {
          startFromMarker = true;
        }
        return;
      }

      if (count < limit) {
        const fileId = obj.name.split("/").pop(); // Extract fileId from path
        files.push({
          fileId,
          size: obj.size,
          lastModified: obj.lastModified,
          etag: obj.etag,
        });
        count++;
      }
    });

    stream.on("error", reject);
    stream.on("end", () => resolve(files));
  });
}

async function findObjectByFileId(fileId) {
  const stream = minioClient.listObjects(bucketName, "", true);

  return new Promise((resolve, reject) => {
    stream.on("data", (obj) => {
      if (obj.name.includes(fileId)) {
        resolve(obj);
      }
    });

    stream.on("error", reject);
    stream.on("end", () => resolve(null));
  });
}

function extractFileInfo(objectName) {
  // Object name format: category/fileId-filename
  const parts = objectName.split("/");
  if (parts.length !== 2) return null;

  const category = parts[0];
  const fileIdAndName = parts[1];

  // Find the UUID pattern in the string
  const uuidPattern =
    /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i;
  const uuidMatch = fileIdAndName.match(uuidPattern);

  if (!uuidMatch) return null;

  const fileId = uuidMatch[1];
  // Get everything after the UUID and the hyphen
  const filename = fileIdAndName.substring(fileId.length + 1);

  return {
    category,
    fileId,
    filename,
  };
}

const uploadToMinio = async (fileData, bucketName = "mybucket") => {
  const normalizedBucketName = bucketName.toLowerCase();
  await ensureBucketExists(normalizedBucketName);

  const fileId = uuidv4();

  await minioClient.putObject(
    normalizedBucketName,
    fileId,
    fileData.buffer,
    fileData.buffer.length,
    {
      "Content-Type": fileData.mimetype,
      "x-amz-meta-filename": fileData.filename,
    }
  );

  return {
    fileId,
    bucketName: normalizedBucketName,
    size: fileData.buffer.length,
    mimetype: fileData.mimetype,
  };
};

module.exports = {
  listObjects,
  findObjectByFileId,
  extractFileInfo,
  uploadToMinio,
};
