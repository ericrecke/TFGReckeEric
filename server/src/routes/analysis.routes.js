const express = require('express');
const { generateAnalysis, getRiskParameters, saveRiskParameters } = require('../controllers/analysis.controllers');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/generate', authMiddleware, generateAnalysis);
router.get('/risk-parameters/:symbol', authMiddleware, getRiskParameters);
router.post('/risk-parameters', authMiddleware, saveRiskParameters);

module.exports = router;
