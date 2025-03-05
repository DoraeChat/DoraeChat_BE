const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cấu hình upload với multer
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/'); 
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024 // Giới hạn 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format is invalid'), false);
    }
  }
});

const uploadAvatar = async (file) => {
  try {
    const uploadOptions = {
      folder: 'avatars',
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp'], 
      transformation: [
        { width: 400, height: 400, crop: 'fill' }, 
        { quality: 'auto' } 
      ],
      overwrite: true, 
      unique_filename: false 
    };

    const result = await cloudinary.uploader.upload(file, uploadOptions);
    
    return {
      url: result.secure_url,
      publicId: result.public_id
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

// Hàm xóa avatar cũ
const deleteAvatar = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  upload,
  uploadAvatar,
  deleteAvatar
};