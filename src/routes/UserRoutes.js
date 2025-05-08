const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const UserMiddleware = require('../middleware/UserMiddleware');

router.post('/', UserController.addUser);
router.put('/:id', UserController.updateUser);
router.delete('/:id', UserController.deleteUser);

router.get('/exists/username/:username', UserController.existsByUsername);
router.get('/exists/:id', UserController.existsById);

router.post('/check-ids', UserController.checkByIds);
router.get('/check/:id', UserController.checkById);

router.get('/search/phone-number/:phoneNumber', UserController.getUserByPhoneNumber);
router.get('/search/username/:username', UserController.findByUsername);
router.get('/search/id/:id', UserController.getById);

router.get('/summary/:id', UserController.getSummaryById);
router.get('/member/:memberId', UserController.getByMemberId);

module.exports = router;    