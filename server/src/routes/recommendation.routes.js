const express = require('express');
const {
    getRecommendations,
    getRecommendationById
} = require('../controllers/recommendation.controllers');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', authMiddleware, getRecommendations);
router.get('/:id', authMiddleware, getRecommendationById);

module.exports = router;
