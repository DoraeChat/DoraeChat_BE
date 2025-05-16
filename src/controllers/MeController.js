const MeService = require("../services/MeService");

const UserController = {
  // [GET] /api/me/profile/:userId
  async getById(req, res, next) {
    try {
      const { _id } = req;
      const user = await MeService.getById(_id);
      res.json(user);
    } catch (error) {
      next(error);
    }
  },

  // [PUT] /api/me/profile
  async updateUser(req, res, next) {
    try {
      const { _id } = req;
      const user = req.body;
      const updatedUser = await MeService.updateUser(_id, user);
      res.json(updatedUser);
    } catch (error) {
      next(error);
    }
  },

  // [PUT] /api/me/avatar
  async updateAvatarUser(req, res, next) {
    try {
      const { _id } = req;
      const updatedUser = await MeService.updateAvatarUser(_id, req.file);

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
      const { _id } = req;
      const updatedUser = await MeService.updateCoverUser(_id, req.file);

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
      const { _id } = req;
      const { oldPassword, newPassword } = req.body;
      await MeService.updatePassword(_id, oldPassword, newPassword);
      res.json({ message: "Password is updated" });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = UserController;
