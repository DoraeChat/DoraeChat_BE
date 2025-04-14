const User = require('../models/User');
const NotFoundError = require('../exceptions/NotFoundError');
const { uploadImages } = require('../config/cloudinary');

const CloudinaryService = {
    async uploadImagesMessage(userId, files) {
        if (!files) {
            throw new Error('Please provide an avatar file');
        }
        if (!Array.isArray(files)) {
            files = [files];
        }
    
        try {
            const uploadResult = await uploadImages(files, userId, 'images');
    
            return uploadResult.map((result) => ({
                url: result.url,
                publicId: result.publicId,
            }));
        } catch (error) {
            throw error;
        }
    },
}

module.exports = CloudinaryService;