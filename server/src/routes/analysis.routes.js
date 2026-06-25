const express = require('express');
const { generateAnalysis, saveRiskParameters } = require('../controllers/analysis.controllers');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/generate', authMiddleware, generateAnalysis);
router.post('/risk-parameters', authMiddleware, saveRiskParameters);

module.exports = router;
