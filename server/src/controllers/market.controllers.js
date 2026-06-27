const MarketData = require('../models/MarketData');
const marketService = require('../services/market.service');
const indicatorService = require('../services/indicator.service');

const getSymbols = async (req, res) => {
    try {
        const symbols = await marketService.getAllowedSymbols();
        res.json({ symbols });
    } catch (error) {
        console.error('Error fetching symbols:', error);
        res.status(500).json({ error: 'Failed to fetch symbols' });
    }
};

const getMarketDataBySymbol = async (req, res) => {
    const { symbol } = req.params;

    try {
        const marketData = await marketService.getTicker24h(symbol);
        const savedMarketData = await MarketData.create(marketData);
        const indicator = await indicatorService.calculateAndSaveIndicators(savedMarketData);

        return res.json({
            message: 'Market data saved successfully',
            data: savedMarketData,
            indicator
        });
    } catch (error) {
        console.error('Error fetching market data:', error);
        res.status(500).json({ error: 'Failed to fetch market data' });
    }
}

const getMarketSummary = async (req, res) => {
    try {
        const tickers = await marketService.getAllowedTickers24h();
        const savedMarketData = await MarketData.insertMany(tickers);
        const indicators = await Promise.all(
            savedMarketData.map((item) => indicatorService.calculateAndSaveIndicators(item))
        );

        return res.json({
            message: 'Market summary fetched successfully',
            symbols: tickers.map((item) => item.symbol),
            data: savedMarketData,
            indicators: indicators.filter(Boolean)
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Error fetching market summary',
            error: error.message
        });
    }
};

const getMarketLive = async (req, res) => {
    try {
        const tickers = await marketService.getAllowedTickers24h();

        return res.json({
            message: 'Live market data fetched successfully',
            symbols: tickers.map((item) => item.symbol),
            data: tickers
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Error fetching live market data',
            error: error.message
        });
    }
};

const getMarketLiveBySymbol = async (req, res) => {
    try {
        const ticker = await marketService.getTicker24h(req.params.symbol);

        return res.json({
            message: 'Live market data fetched successfully',
            data: ticker
        });
    } catch (error) {
        const isValidationError = error.message.includes('not available');

        return res.status(isValidationError ? 400 : 500).json({
            message: 'Error fetching live market data',
            error: error.message
        });
    }
};

const getMarketCandlesBySymbol = async (req, res) => {
    try {
        const { symbol } = req.params;
        const period = String(req.query.period || '1H').toUpperCase();
        const candles = await marketService.getCandles(symbol, period, req.query.limit);

        return res.json({
            symbol: String(symbol).toUpperCase(),
            period,
            count: candles.length,
            data: candles
        });
    } catch (error) {
        const isValidationError =
            error.message.includes('not available') ||
            error.message.includes('Invalid period');

        return res.status(isValidationError ? 400 : 500).json({
            message: 'Error al obtener velas historicas',
            error: error.message
        });
    }
};

const getPeriodStartDate = (period) => {
    const now = Date.now();
    const periods = {
        '1H': 24 * 60 * 60 * 1000,
        '4H': 7 * 24 * 60 * 60 * 1000,
        '1D': 30 * 24 * 60 * 60 * 1000,
        '1W': 180 * 24 * 60 * 60 * 1000
    };

    return new Date(now - (periods[period] || periods['1H']));
};

const getMarketHistoryBySymbol = async (req, res) => {
    try {
        const { symbol } = req.params;
        const period = String(req.query.period || '1H').toUpperCase();

        const history = await MarketData.find({
            symbol: String(symbol).toUpperCase(),
            timestamp: {
                $gte: getPeriodStartDate(period)
            }
        })
            .sort({ timestamp: -1 })
            .limit(1000);

        return res.json({
            symbol: String(symbol).toUpperCase(),
            period,
            count: history.length,
            data: history
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Error al obtener historial de mercado',
            error: error.message
        });
    }
};

module.exports = {
    getSymbols,
    getMarketDataBySymbol,
    getMarketSummary,
    getMarketLive,
    getMarketLiveBySymbol,
    getMarketCandlesBySymbol,
    getMarketHistoryBySymbol
};
