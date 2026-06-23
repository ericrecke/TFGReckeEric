const MarketData = require('../models/MarketData');
const marketService = require('../services/market.service');

const getSymbols = async (req, res) => {
    try {
        const symbols = await marketService.getAllowedSymbols();
        res.json(symbols);
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

        return res.json({
            message: 'Market data saved successfully',
            data: savedMarketData
        });
    } catch (error) {
        console.error('Error fetching market data:', error);
        res.status(500).json({ error: 'Failed to fetch market data' });
    }
}

const getMarketHistoryBySymbol = async (req, res) => {
    try {
        const { symbol } = req.params;

        const history = await MarketData.find({
            symbol: String(symbol).toUpperCase()
        })
            .sort({ timestamp: -1 })
            .limit(50);

        return res.json({
            symbol: String(symbol).toUpperCase(),
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
    getMarketHistoryBySymbol
};