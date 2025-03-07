const User = require('../models/User');
const NotFoundError = require('../exceptions/NotFoundError');
const fs = require('fs').promises;
const { uploadAvatar, deleteAvatar } = require('../config/cloudinary');

const UserService = {
    async existsById(id) {
        return await User.existsById(id);
    },

    async checkByIds(ids) {
        return await User.checkByIds(ids);
    },

    async getById(id) {
        const user = await User.getById(id);
        if (!user) {
            throw new NotFoundError('User not found');
        }
        return user;
    },

    async existsByUsername(username) {
        return await User.existsByUsername(username);
    },

    async findByUsername(username) {
        const user = await User.findByUsername(username);
        if (!user) {
            throw new NotFoundError('User not found');
        }
        return user;
    },

    async checkById(id) {
        return await User.checkById(id);
    },

    async getSummaryById(id) {
        const userSummary = await User.getSummaryById(id);
        if (!userSummary) {
            throw new NotFoundError('User summary not found');
        }
        return userSummary;
    },

    // add user
    async addUser(user) {
        return await User.addUser(user);
    },

    // update user
    async updateUser(id, user) {
        return await User.updateUser(id, user);
    },

    // delete user
    async deleteUser(id) {
        return await User.deleteUser(id);
    },

    // update avatar user
    async updateAvatarUser(userId, file) {
        // Kiểm tra xem file có tồn tại không
        if (!file) {
          throw new Error('Please provide an avatar file');
        }
    
        try {
          // Upload avatar mới lên Cloudinary
          const uploadResult = await uploadAvatar(file.path, userId);
    
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
        //   await fs.unlink(file.path).catch(() => {});
          throw error;
        }
      }
};

module.exports = UserService;
