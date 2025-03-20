const express = require('express');
const router = express.Router();
const MeController = require('../controllers/MeController');
const auth = require('../middleware/auth');
const UserMiddleware = require('../middleware/UserMiddleware');
const { upload } = require('../config/cloudinary');

router.put('/profile', MeController.updateUser);
router.get('/profile', MeController.getById);
router.put('/avatar', (req, res, next) => {
    // Lưu id vào req để sử dụng ở middleware
    req.userId = req.params.id;
    next();
}, upload.single('avatar'), MeController.updateAvatarUser);
router.put('/cover', (req, res, next) => {
    // Lưu id vào req để sử dụng ở middleware
    req.userId = req.params.id;
    next();
}, upload.single('cover'), MeController.updateCoverUser);
router.put('/password', MeController.updatePassword);

module.exports = router;    