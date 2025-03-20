const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const UserMiddleware = require('../middleware/UserMiddleware');

router.post('/', UserController.addUser);
router.put('/:id', UserController.updateUser);
router.delete('/:id', UserController.deleteUser);
router.get('/exists/:id', UserController.existsById);
router.get('/exists/username/:username', UserController.existsByUsername);
router.get('/search/id/:id', UserController.getById);
router.get('/search/username/:username', UserController.findByUsername);
router.get('/check/:id', UserController.checkById);
router.post('/check-ids', UserController.checkByIds);
router.get('/summary/:id', UserController.getSummaryById);

module.exports = router;    