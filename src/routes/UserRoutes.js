const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const UserMiddleware = require('../middleware/UserMiddleware');

router.get('/exists/:id', UserController.existsById);
router.post('/check-ids', UserController.checkByIds);
router.get('/exists/username/:username', UserController.existsByUsername);
router.get('/search/id/:id', UserController.getById);
router.get('/search/username/:username', UserController.findByUsername);
router.get('/check/:id', UserController.checkById);
router.get('/summary/:id', UserController.getSummaryById);
router.post('/', UserController.addUser);
router.delete('/:id', UserController.deleteUser);

module.exports = router;    