const express = require('express');
const {
    getSymbols,
    getMarketDataBySymbol,
    getMarketSummary,
    getMarketLive,
    getMarketLiveBySymbol,
    getMarketCandlesBySymbol,
    getMarketHistoryBySymbol
} = require('../controllers/market.controllers');

const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/symbols', authMiddleware, getSymbols);
router.get('/summary', authMiddleware, getMarketSummary);
router.get('/live', authMiddleware, getMarketLive);
router.get('/live/:symbol', authMiddleware, getMarketLiveBySymbol);
router.get('/:symbol/candles', authMiddleware, getMarketCandlesBySymbol);
router.get('/:symbol/history', authMiddleware, getMarketHistoryBySymbol);
router.get('/:symbol', authMiddleware, getMarketDataBySymbol);

module.exports = router;
