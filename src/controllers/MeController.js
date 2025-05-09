const MeService = require("../services/MeService");

const UserController = {
  // [GET] /api/me/profile/:userId
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const user = await MeService.getById(id);
      res.json(user);
    } catch (error) {
      next(error);
    }
  },

  // [PUT] /api/me/profile
  async updateUser(req, res, next) {
    try {
      const user = req.body;
      const updatedUser = await MeService.updateUser(user.id, user);
      res.json(updatedUser);
    } catch (error) {
      next(error);
    }
  },

  // [PUT] /api/me/avatar
  async updateAvatarUser(req, res, next) {
    try {
      const { id } = req.body;
      const updatedUser = await MeService.updateAvatarUser(id, req.file);

      res.json({
        message: "User avatar is updated successfully!",
        avatar: updatedUser.avatarUrl,
      });
    } catch (error) {
      next(error);
    }
  },

  // [PUT] /api/me/cover
  async updateCoverUser(req, res, next) {
    try {
      const { id } = req.body;
      const updatedUser = await MeService.updateCoverUser(id, req.file);

      res.json({
        message: "User cover is updated successfully!",
        cover: updatedUser.coverUrl,
      });
    } catch (error) {
      next(error);
    }
  },

  // [PUT] /api/me/password
  async updatePassword(req, res, next) {
    try {
      const { id, oldPassword, newPassword } = req.body;
      await MeService.updatePassword(id, oldPassword, newPassword);
      res.json({ message: "Password is updated" });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = UserController;
