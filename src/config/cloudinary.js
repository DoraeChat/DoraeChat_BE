const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const path = require("path");

const formatDateToYYYYMMDD = (timestamp) => {
  const date = new Date(timestamp);

  const year = date.getFullYear();
  // getMonth() trả về giá trị từ 0-11, nên cần +1 và đảm bảo luôn có 2 chữ số
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}${month}${day}`;
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cấu hình upload với multer
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
      const userId = req.userId || "unknown";
      const uniqueSuffix = userId + "-" + formatDateToYYYYMMDD(Date.now());
      cb(
        null,
        file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
      );
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // Giới hạn 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Format is invalid"), false);
    }
  },
});

const uploadImage = async (file, userId, type) => {
  const uniqueSuffix = userId + "-" + formatDateToYYYYMMDD(Date.now());
  const filename = type === 'avatar' ? "avatar-" + uniqueSuffix : "cover-" + uniqueSuffix;
  try {
    const uploadOptions = {
      folder: type === 'avatar' ? "avatars" : "covers",
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

// Hàm xóa avatar cũ
const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Delete error:", error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  upload,
  uploadImage,
  deleteImage,
};
