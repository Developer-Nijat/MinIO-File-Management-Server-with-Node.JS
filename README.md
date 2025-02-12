# MinIO File Management Server with Node.js

This API provides file management functionalities using MinIO for object storage. It includes file upload, retrieval, listing, and deletion, supporting single and multiple file uploads, including base64-encoded files.

## Features
- Upload single, multiple, or base64-encoded files
- List files with pagination and search filters
- Retrieve files by ID
- Delete files by ID
- MinIO object storage integration

## Prerequisites
- Node.js installed
- MinIO server set up and running
- `.env` file with the following values:
  ```
  MINIO_ENDPOINT=<your-minio-endpoint>
  MINIO_ACCESS_KEY=<your-access-key>
  MINIO_SECRET_KEY=<your-secret-key>
  MINIO_BUCKET=<your-bucket-name>
  ```

## Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/Developer-Nijat/MinIO-File-Management-Server-with-Node.JS.git
   cd MinIO-File-Management-Server-with-Node.JS
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Run the server:
   ```sh
   npm start
   ```

## API Endpoints
### File Upload
- **Upload a single file**
  ```http
  POST /upload
  ```
  **Body:** `multipart/form-data`
  - `file` (required): The file to be uploaded
  - `category` (optional): Category for the file

- **Upload multiple files**
  ```http
  POST /upload/multiple
  ```
  **Body:** `multipart/form-data`
  - `files` (required): Multiple files to be uploaded (max 10)
  - `category` (optional): Category for the files

- **Upload base64 files**
  ```http
  POST /upload/base64
  ```
  **Body:** `JSON`
  ```json
  {
    "files": [
      { "filename": "example.txt", "content": "base64-encoded-data", "mimetype": "text/plain" }
    ],
    "category": "documents"
  }
  ```

### File Retrieval
- **Get list of files**
  ```http
  GET /files?keyword=search&limit=10&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&sortBy=lastModified&sortOrder=desc
  ```
  **Query Parameters:**
  - `keyword` (optional): Search keyword
  - `limit` (optional): Number of files per page (default: 10)
  - `startDate`, `endDate` (optional): Date range filter
  - `sortBy` (optional): Sort field (`filename`, `size`, `category`, `lastModified`)
  - `sortOrder` (optional): Sort order (`asc`, `desc`)

- **Get a file by ID**
  ```http
  GET /file/:fileId
  ```

### File Deletion
- **Delete a file by ID**
  ```http
  DELETE /file/:fileId
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

## Technologies Used
- Node.js
- Express.js
- MinIO
- Multer (for file handling)

## License
This project is licensed under the MIT License.

Created by Nijat Aliyev (@developer.nijat)

