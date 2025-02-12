const { v4: uuidv4 } = require("uuid");
const { minioClient, bucketName } = require("./minioClientSetup");

async function listObjects(prefix = "", limit = 10, marker = "") {
  const stream = minioClient.listObjects(bucketName, prefix, true);
  const files = [];
  let count = 0;
  let startFromMarker = !marker;

  return new Promise((resolve, reject) => {
    stream.on("data", (obj) => {
      // If marker is provided, skip until we find it
      if (!startFromMarker) {
        if (obj.name === marker) {
          startFromMarker = true;
        }
        return;
      }

      if (count < limit) {
        const fileInfo = extractFileInfo(obj.name);
        if (fileInfo) {
          files.push({
            objectName: obj.name,
            size: obj.size,
            lastModified: obj.lastModified,
            etag: obj.etag,
            fileId: fileInfo.fileId,
            filename: fileInfo.filename,
            category: fileInfo.category,
          });
          count++;
        }
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

const uploadToMinio = async (fileData, category = "default") => {
  const fileId = uuidv4();
  const objectName = `${category}/${fileId}-${fileData.filename}`;

  await minioClient.putObject(
    bucketName,
    objectName,
    fileData.buffer,
    fileData.buffer.length,
    {
      "Content-Type": fileData.mimetype,
      "x-amz-meta-fileid": fileId,
      "x-amz-meta-filename": fileData.filename,
      "x-amz-meta-category": category,
    }
  );

  return {
    fileId,
    objectName,
    category,
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
