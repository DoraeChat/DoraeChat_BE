const User = require('../models/User');
const NotFoundError = require('../exceptions/NotFoundError');
const fs = require('fs').promises;
const { uploadImage } = require('../config/cloudinary');
const userValidate = require('../validates/userValidate');
const bcrypt = require('bcryptjs');
const CustomError = require('../exceptions/CustomError');

const MeService = {

    async getById(id) {
        const user = await User.getById(id);
        if (!user) {
            throw new NotFoundError('User');
        }
        return user;
    },

    async updateUser(id, user) {
        return await User.updateUser(id, user);
    },
    
    async updateAvatarUser(userId, file) {
        if (!file) {
            throw new Error('Please provide an avatar file');
        }
    
        try {
            const uploadResult = await uploadImage(file.path, userId, 'avatar');
    
            const updatedUser = await User.updateAvatarUser(userId, uploadResult.url);
    
            await fs.unlink(file.path);
    
            return {
                message: 'Updated avatar successfully!',
                avatarUrl: updatedUser.avatar
            };
        } catch (error) {
            throw error;
        }
    },

    async updateCoverUser(userId, file) {
        if (!file) {
            throw new Error('Please provide an cover file');
        }
    
        try {
            const uploadResult = await uploadImage(file.path, userId, 'cover');
    
            const updatedUser = await User.updateCoverUser(userId, uploadResult.url);
    
            await fs.unlink(file.path);
    
            return {
                message: 'Updated cover successfully!',
                coverUrl: updatedUser.coverImage
            };
        } catch (error) {
            throw error;
        }
    },

    async updatePassword(id, oldPassword, newPassword) {
        const user = await User.findOne({ _id: id });
        if (!user) {
            throw new NotFoundError('User');
        }

        if (!userValidate.validatePassword(newPassword)) {
            throw new CustomError('Invalid password', 400);
        }

        const isOldPasswordMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isOldPasswordMatch) {
            throw new CustomError('Old password is incorrect', 400);
        }

        const isPasswordMatch = await bcrypt.compare(newPassword, user.password);
        if (isPasswordMatch) {
            throw new CustomError('The new password cannot be the same as the old password', 400);
        }

        user.password = newPassword;
        return await user.save();
    }
};

module.exports = MeService;
