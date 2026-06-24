const express = require('express');
const { register, login, refresh, profile } = require('../controllers/auth.controllers');

const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.get('/profile', authMiddleware, profile);

module.exports = router;
