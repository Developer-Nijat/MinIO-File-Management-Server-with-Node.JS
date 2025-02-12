const validateBase64Upload = (base64Data) => {
  const errors = [];

  // Check if required fields exist
  if (!base64Data || !base64Data.content || !base64Data.filename) {
    errors.push(
      "Invalid base64 data format. Must include content and filename"
    );
    return errors;
  }

  // Check if filename is valid
  if (
    typeof base64Data.filename !== "string" ||
    base64Data.filename.trim() === ""
  ) {
    errors.push("Filename must be a non-empty string");
  }

  // Check if content is a string
  if (typeof base64Data.content !== "string") {
    errors.push("Content must be a string");
    return errors;
  }

  // Remove any data URL prefix if present
  let base64String = base64Data.content;
  if (base64String.includes(",")) {
    base64String = base64String.split(",")[1];
  }

  // Check if the string contains valid base64 characters
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(base64String)) {
    errors.push("Content contains invalid base64 characters");
    return errors;
  }

  // Check if the length is valid (must be multiple of 4)
  if (base64String.length % 4 !== 0) {
    errors.push("Content length is not valid for base64");
    return errors;
  }

  // Try to decode the base64 string
  try {
    const buffer = Buffer.from(base64String, "base64");

    // Check if decoding actually produced any data
    if (buffer.length === 0) {
      errors.push("Content decodes to empty data");
      return errors;
    }

    // Check file size
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (buffer.length > MAX_FILE_SIZE) {
      errors.push(
        `File size exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }

    // Optional: Check if decoded data looks valid for the specified mimetype
    if (base64Data.mimetype) {
      if (base64Data.mimetype.startsWith("image/")) {
        // For images, first few bytes should contain magic numbers
        const isPNG =
          buffer[0] === 0x89 &&
          buffer[1] === 0x50 &&
          buffer[2] === 0x4e &&
          buffer[3] === 0x47;
        const isJPEG =
          buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
        const isGIF =
          buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;

        if (base64Data.mimetype === "image/png" && !isPNG) {
          errors.push("Content is not a valid PNG image");
        } else if (base64Data.mimetype === "image/jpeg" && !isJPEG) {
          errors.push("Content is not a valid JPEG image");
        } else if (base64Data.mimetype === "image/gif" && !isGIF) {
          errors.push("Content is not a valid GIF image");
        }
      }
      // Add more mimetype validations as needed
    }
  } catch (error) {
    errors.push("Invalid base64 content: " + error.message);
  }

  return errors;
};

const validateFileUpload = (file) => {
  const errors = [];

  if (!file) {
    errors.push("No file provided");
    return errors;
  }

  // Add any file validation rules here
  // Example: file size limit
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  return errors;
};

const validateQueryParams = (query) => {
  const errors = [];

  // Validate limit
  const limit = parseInt(query.limit || "10", 10);
  if (isNaN(limit) || limit < 1) {
    errors.push("Limit must be a positive number");
  }

  // Validate dates if provided
  if (query.startDate && isNaN(Date.parse(query.startDate))) {
    errors.push("Invalid startDate format. Use YYYY-MM-DD or ISO date string");
  }
  if (query.endDate && isNaN(Date.parse(query.endDate))) {
    errors.push("Invalid endDate format. Use YYYY-MM-DD or ISO date string");
  }

  return errors;
};

module.exports = {
  validateBase64Upload,
  validateFileUpload,
  validateQueryParams,
};
