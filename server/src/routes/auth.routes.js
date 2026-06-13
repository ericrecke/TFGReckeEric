const express = require('express');
const { register, login, profile } = require('../controllers/auth.controllers');

const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authMiddleware, profile);

module.exports = router;
