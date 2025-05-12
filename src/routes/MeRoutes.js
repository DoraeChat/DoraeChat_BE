const express = require('express');
const router = express.Router();
const MeController = require('../controllers/MeController');
const { upload } = require('../config/cloudinary');

router.put('/profile', MeController.updateUser);
router.get('/profile', MeController.getById);
router.put('/avatar', upload.single('avatar'), MeController.updateAvatarUser);
router.put('/cover', upload.single('cover'), MeController.updateCoverUser);
router.put('/password', MeController.updatePassword);

module.exports = router;    