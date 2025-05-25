const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const getFileTypeCategory = (mimetype) => {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/")) return "video";
  if (mimetype.startsWith("audio/")) return "audio";
  if (["application/pdf"].includes(mimetype)) return "pdf";
  if (
    [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ].includes(mimetype)
  )
    return "doc";
  if (
    [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ].includes(mimetype)
  )
    return "excel";
  if (
    [
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ].includes(mimetype)
  )
    return "powerpoint";
  if (
    [
      // ZIP
      "application/zip", // Chuẩn chính thức (IANA)
      "application/x-zip-compressed", // Dự phòng cho ZIP
      "application/x-compressed",
      // RAR
      "application/vnd.rar", // Chuẩn hiện đại (từ 2015)
      "application/x-rar-compressed", // Phổ biến trước đây
      "application/x-compressed",

      // 7Z
      "application/x-7z-compressed", // Dành cho file .7z

      // TAR
      "application/x-tar", // Dành cho file .tar
      "application/gzip", // Dành cho .tar.gz (nếu cần)
    ].includes(mimetype)
  )
    return "archive";
  if (mimetype === "text/plain" || mimetype === "text/csv") return "text";
  return "other";
};

const fileTypeConfigs = {
  image: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  },
  video: {
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedMimeTypes: [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-msvideo",
      "video/x-ms-wmv",
    ],
  },
  audio: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/aac", "audio/x-m4a", "audio/m4a"],
  },
  pdf: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ["application/pdf"],
  },
  doc: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },
  excel: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
  },
  powerpoint: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
  },
  archive: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      // ZIP
      "application/zip", // Chuẩn chính thức (IANA)
      "application/x-zip-compressed", // Dự phòng cho ZIP
      "application/x-compressed",
      // RAR
      "application/vnd.rar", // Chuẩn hiện đại (từ 2015)
      "application/x-rar-compressed", // Phổ biến trước đây
      "application/x-compressed",

      // 7Z
      "application/x-7z-compressed", // Dành cho file .7z

      // TAR
      "application/x-tar", // Dành cho file .tar
      "application/gzip", // Dành cho .tar.gz (nếu cần)
    ],
  },
  text: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ["text/plain", "text/csv"],
  },
};

const allAllowedMimeTypes = Object.values(fileTypeConfigs).flatMap(
  (config) => config.allowedMimeTypes
);

// Cấu hình upload với multer
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Create folder structure based on file type
      const fileCategory = getFileTypeCategory(file.mimetype);
      const uploadPath = path.join("uploads", fileCategory);

      // Ensure the directory exists
      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = formatDateToYYYYMMDD(Date.now()) + "-" + uuidv4();
      const fileCategory = getFileTypeCategory(file.mimetype);

      cb(
        null,
        fileCategory +
          "-" +
          file.fieldname +
          "-" +
          uniqueSuffix +
          path.extname(file.originalname)
      );
    },
  }),
  limits: {
    fileSize: 100 * 1024 * 1024, // Max 100MB
  },
  fileFilter: (req, file, cb) => {
    const fileCategory = getFileTypeCategory(file.mimetype);
    const config = fileTypeConfigs[fileCategory];

    // Check if mimetype is allowed
    if (!allAllowedMimeTypes.includes(file.mimetype)) {
      return cb(
        new Error(`File format '${file.mimetype}' is not supported`),
        false
      );
    }

    // Set file size limit based on file type
    req.fileSizeLimit = config.maxSize;

    // multer's limits
    if (file.size && file.size > config.maxSize) {
      return cb(
        new Error(
          `File size exceeds the limit for ${fileCategory} files (${
            config.maxSize / (1024 * 1024)
          }MB)`
        ),
        false
      );
    }

    // Store file category for later use
    file.fileCategory = fileCategory;
    cb(null, true);
  },
});

// Custom middleware to check file size after multer
const checkFileSize = (req, res, next) => {
  if (!req.file && !req.files) return next();

  const files = req.files || [req.file];

  for (const file of files) {
    const fileCategory =
      file.fileCategory || getFileTypeCategory(file.mimetype);
    const maxSize = fileTypeConfigs[fileCategory].maxSize;

    if (file.size > maxSize) {
      // Delete the uploaded file
      fs.unlinkSync(file.path);
      return next(
        new Error(
          `File '${
            file.originalname
          }' exceeds the maximum size limit for ${fileCategory} files (${
            maxSize / (1024 * 1024)
          }MB)`
        )
      );
    }
  }

  next();
};

// upload avatar và cover
const uploadImage = async (file, userId, type) => {
  const uniqueSuffix = userId + "-" + formatDateToYYYYMMDD(Date.now());
  const filename =
    type === "avatar" ? "avatar-" + uniqueSuffix : "cover-" + uniqueSuffix;
  try {
    const uploadOptions = {
      folder: type === "avatar" ? "avatars" : "covers",
      allowed_formats: ["jpg", "png", "jpeg", "webp"],
      transformation: [
        { width: 400, height: 400, crop: "fill" },
        { quality: "auto" },
      ],
      overwrite: true,
      unique_filename: true,
      public_id: filename,
    };

    const result = await cloudinary.uploader.upload(file, uploadOptions);

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
};

// upload multiple images cho message
const uploadImages = async (files, userId, type) => {
  try {
    // Ensure files is an array
    const fileArray = Array.isArray(files) ? files : [files];

    const uploadPromises = fileArray.map(async (file) => {
      const uniqueSuffix = userId + "-" + formatDateToYYYYMMDD(Date.now());

      const basename = file.path.slice(-36).replace(/\.[^/.]+$/, "");
      const filename = "image-" + uniqueSuffix + "-" + basename;

      const uploadOptions = {
        folder: type || "images",
        allowed_formats: ["jpg", "png", "jpeg", "webp"],
        transformation: [
          { width: 800, height: 800, crop: "limit" },
          { quality: "auto" },
        ],
        unique_filename: true,
        public_id: filename,
      };

      try {
        const result = await cloudinary.uploader.upload(
          file.path,
          uploadOptions
        );
        
        fs.unlinkSync(file.path);
  
        return {
          url: result.secure_url,
          publicId: result.public_id,
        };

      } catch (error) {
        console.error("Upload failed:", error);
        throw error;
      }
    });

    return Promise.all(uploadPromises);
  } catch (error) {
    console.error("Multiple images upload error:", error);
    throw error;
  }
};

// Upload video
const uploadVideo = async (file, userId, type = "videos") => {
  const uniqueSuffix =
    userId + "-" + formatDateToYYYYMMDD(Date.now()) + "-" + uuidv4();
  const filename = "video-" + uniqueSuffix;

  try {
    const uploadOptions = {
      folder: type || "videos",
      allowed_formats: ["mp4", "mov", "avi", "wmv", "flv", "webm"],
      resource_type: "video",
      chunk_size: 6000000, // 6MB chunks for better upload handling
      eager: [
        {
          format: "mp4",
          transformation: [{ quality: "auto" }, { bit_rate: "1m" }],
        },
      ],
      eager_async: true,
      overwrite: true,
      unique_filename: true,
      public_id: filename,
    };

    const result = await cloudinary.uploader.upload(file, uploadOptions);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      duration: result.duration, // Video duration in seconds
      format: result.format,
    };
  } catch (error) {
    console.error("Video upload error:", error);
    throw error;
  }
};

// Upload various file types
const uploadFile = async (file, userId, originalFilename) => {
  const fileExtension = path
    .extname(originalFilename)
    .toLowerCase()
    .substring(1);
  const uniqueSuffix =
    userId + "-" + formatDateToYYYYMMDD(Date.now()) + "-" + uuidv4();
  const filename = "file-" + uniqueSuffix;

  // Determine folder and resource type based on file extension
  const fileCategory = getFileTypeCategory(file.mimetype);
  let folderName = "files/" + fileCategory;
  let resourceType = "auto";
  let fileType = fileCategory;

  if (
    fileCategory === "pdf" ||
    fileCategory === "audio" ||
    fileCategory === "doc" ||
    fileCategory === "excel" ||
    fileCategory === "powerpoint" ||
    fileCategory === "archive"
  ) {
    resourceType = "raw";
  }

  try {
    const uploadOptions = {
      folder: folderName,
      resource_type: resourceType,
      public_id: filename,
      unique_filename: true,
      use_filename: true,
    };

    const result = await cloudinary.uploader.upload(file.path, uploadOptions);

    fs.unlinkSync(file.path);

    let downloadUrl;
    if (fileCategory === "pdf" || fileCategory === "archive") {
      // url tải xuống
      downloadUrl = `https://res.cloudinary.com/${
        cloudinary.config().cloud_name
      }/raw/upload/files/${fileCategory}/${result.display_name}`;
    }

    return {
      url:
        fileCategory === "pdf" || fileCategory === "archive"
          ? downloadUrl
          : result.secure_url,
      publicId: result.public_id,
      fileType: fileType,
      format: fileExtension,
      size: result.bytes, // File size in bytes
    };
  } catch (error) {
    console.error(`File upload error (${fileExtension}):`, error);
    throw error;
  }
};

// Hàm xóa avatar cũ
const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Delete error:", error);
    throw error;
  }
};

const formatDateToYYYYMMDD = (timestamp) => {
  const date = new Date(timestamp);

  const year = date.getFullYear();
  // getMonth() trả về giá trị từ 0-11, nên cần +1 và đảm bảo luôn có 2 chữ số
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}${month}${day}`;
};

module.exports = {
  cloudinary,
  upload,
  uploadImage,
  deleteImage,
  uploadImages,
  checkFileSize,
  uploadVideo,
  uploadFile,
};
