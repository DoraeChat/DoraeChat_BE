const User = require('../models/User');
const NotFoundError = require('../exceptions/NotFoundError');
const fs = require('fs').promises;
const { uploadImage, deleteImage } = require('../config/cloudinary');
const userValidate = require('../validates/userValidate');
const bcrypt = require('bcryptjs');
const CustomError = require('../exceptions/CustomError');

const MeService = {

    async getById(id) {
        const user = await User.getById(id);
        if (!user) {
            throw new NotFoundError('User not found');
        }
        return user;
    },

    // update user
    async updateUser(id, user) {
        return await User.updateUser(id, user);
    },
    
    // update avatar user
    async updateAvatarUser(userId, file) {
        // Kiểm tra xem file có tồn tại không
        if (!file) {
            throw new Error('Please provide an avatar file');
        }
    
        try {
            // Upload avatar mới lên Cloudinary
            const uploadResult = await uploadImage(file.path, userId, 'avatar');
    
            // Cập nhật avatar trong database
            const updatedUser = await User.updateAvatarUser(userId, uploadResult.url);
    
            // Xóa file tạm sau khi upload
            await fs.unlink(file.path);
    
            return {
                message: 'Updated avatar successfully!',
                avatarUrl: uploadResult.url
            };
        } catch (error) {
            // Xóa file tạm nếu upload thất bại
            // await fs.unlink(file.path).catch(() => {});
            throw error;
        }
    },

    // update cover user
    async updateCoverUser(userId, file) {
        // Kiểm tra xem file có tồn tại không
        if (!file) {
            throw new Error('Please provide an cover file');
        }
    
        try {
            // Upload cover mới lên Cloudinary
            const uploadResult = await uploadImage(file.path, userId, 'cover');
    
            // Cập nhật cover trong database
            const updatedUser = await User.updateCoverUser(userId, uploadResult.url);
    
            // Xóa file tạm sau khi upload
            await fs.unlink(file.path);
    
            return {
                message: 'Updated cover successfully!',
                coverUrl: uploadResult.url
            };
        } catch (error) {
            // Xóa file tạm nếu upload thất bại
            // await fs.unlink(file.path).catch(() => {});
            throw error;
        }
    },

    async updatePassword(id, oldPassword, newPassword) {
        // Tìm người dùng
        const user = await User.findOne({ _id: id });
        if (!user) {
            throw new CustomError('Không tìm thấy người dùng', 404);
        }

        // Kiểm tra mật khẩu mới
        if (!userValidate.validatePassword(newPassword)) {
            throw new CustomError('Mật khẩu không hợp lệ', 400);
        }

        // Kiểm tra mật khẩu cũ
        const isOldPasswordMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isOldPasswordMatch) {
            throw new CustomError('Mật khẩu cũ không đúng', 400);
        }

        // Kiểm tra mật khẩu mới có giống mật khẩu cũ không
        const isPasswordMatch = await bcrypt.compare(newPassword, user.password);
        if (isPasswordMatch) {
            throw new CustomError('Mật khẩu mới không được giống mật khẩu cũ', 400);
        }

        // Lưu mật khẩu mới
        user.password = newPassword;
        return await user.save();
    }
};

module.exports = MeService;
