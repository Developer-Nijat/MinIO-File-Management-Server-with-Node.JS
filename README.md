# MinIO File Management Server with Node.js

A simple file management server built with Node.js and MinIO, providing APIs to upload, list, search, read, and delete files.

## Features

- **File Upload**: Upload files with optional categorization.
- **File Listing**: List files in a bucket with optional prefix filtering.
- **File Search**: Search files by keyword.
- **File Download**: Retrieve files from the server.
- **File Deletion**: Delete specific files.

## Prerequisites

1. **Node.js**: Ensure you have Node.js installed. You can download it from [Node.js](https://nodejs.org/).
2. **MinIO Server**: Set up a MinIO server. Follow the instructions [here](https://min.io/open-source/download?platform=windows).

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Developer-Nijat/MinIO-File-Management-Server-with-Node.JS.git
   cd MinIO-File-Management-Server-with-Node.JS
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the project root with the following variables:

   ```env
   MINIO_ENDPOINT=your-minio-endpoint
   MINIO_PORT=9000
   MINIO_USE_SSL=false
   MINIO_ACCESS_KEY=your-access-key
   MINIO_SECRET_KEY=your-secret-key
   MINIO_BUCKET=your-bucket-name
   ```

4. Ensure the specified bucket exists in your MinIO server. The server will create it if it doesn't exist.

## Running the Server

Start the server:

```bash
node server.js
```

The server will run at [http://localhost:3000](http://localhost:3000).

## API Endpoints

### Upload File

- **Endpoint**: `POST /upload`
- **Description**: Upload a file with an optional category.
- **Request**:
  - Form data: `file` (required), `category` (optional)
- **Response**:
  ```json
  {
    "message": "File uploaded successfully.",
    "fileId": "generated-file-id",
    "objectName": "object-name-in-bucket"
  }
  ```

---

### List Files

- **Endpoint**: `GET /files`
- **Query Parameters**:
  - `prefix` (optional): Filter files by prefix.
  - `limit` (optional): Limit the number of files returned (default: 10).
- **Response**:
  ```json
  [
    {
      "name": "file-name",
      "size": 12345,
      "lastModified": "2024-01-01T00:00:00.000Z",
      "etag": "etag-value"
    }
  ]
  ```

---

### Search Files

- **Endpoint**: `GET /files/search`
- **Query Parameters**:
  - `keyword` (required): Search term for file names.
  - `prefix` (optional): Filter files by prefix.
- **Response**:
  ```json
  [
    {
      "name": "file-name",
      "size": 12345,
      "lastModified": "2024-01-01T00:00:00.000Z",
      "etag": "etag-value"
    }
  ]
  ```

---

### Read File

- **Endpoint**: `GET /file/*`
- **Description**: Retrieve a file from the server.
- **Response**: File download.

---

### Delete File

- **Endpoint**: `DELETE /file/*`
- **Description**: Delete a file from the bucket.
- **Response**:
  ```json
  {
    "message": "File deleted successfully."
  }
  ```

## API Project Structure

```
.
├── server.js        # Main server file
├── package.json     # Dependencies and scripts
├── .env             # Environment variables (create this file)
└── README.md        # Documentation
```

## SERVER Project Structure

```
.
├── /data            # Stored files
├── package.json     # Dependencies and scripts
├── minio.exe        # Main server file
```

## Notes

- Ensure the MinIO server is running and accessible with the credentials provided in the `.env` file.
- Use tools like Postman or cURL to test the API endpoints.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.