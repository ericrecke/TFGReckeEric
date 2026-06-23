const express = require('express');
const { getSymbols, getMarketDataBySymbol, getMarketHistoryBySymbol } = require('../controllers/market.controllers');

const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/symbols', authMiddleware, getSymbols);
router.get('/:symbol', authMiddleware, getMarketDataBySymbol);
router.get('/:symbol/history', authMiddleware, getMarketHistoryBySymbol);

module.exports = router;
