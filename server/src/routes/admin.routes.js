const express = require('express');
const { getUsers, updateUser } = require('../controllers/admin.controllers');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

const router = express.Router();

router.use(authMiddleware, adminMiddleware);
router.get('/users', getUsers);
router.patch('/users/:id', updateUser);

module.exports = router;
