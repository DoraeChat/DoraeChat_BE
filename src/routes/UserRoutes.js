const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const auth = require('../middleware/auth');
const UserMiddleware = require('../middleware/UserMiddleware');

router.get('/exists/:id', auth, UserController.existsById);
router.post('/check-ids', auth, UserMiddleware.checkAdminRole, UserController.checkByIds);
router.get('/:id', auth, UserController.getById);
router.get('/exists/username/:username', auth, UserController.existsByUsername);
router.get('/username/:username', auth, UserController.findByUsername);
router.get('/check/:id', auth, UserController.checkById);
router.get('/summary/:id', auth, UserController.getSummaryById);

module.exports = router;