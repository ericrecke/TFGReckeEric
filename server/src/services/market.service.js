const axios = require('axios');

const BINANCE_BASE_URL = process.env.BINANCE_BASE_URL || 'https://api.binance.com';

const allowedSymbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT']; // Add more symbols as needed

const normalizeSymbol = (symbol) => {
    return String(symbol || '').trim().toUpperCase();
}

const validateAllowedSymbol = (symbol) => {
    const normalizedSymbol = normalizeSymbol(symbol);
    if (!allowedSymbols.includes(normalizedSymbol)) {
        throw new Error(`Symbol ${normalizedSymbol} is not allowed. Allowed symbols: ${allowedSymbols.join(', ')}`);
    }
    return normalizedSymbol;
};

const getAllowedSymbols = () => {
    return allowedSymbols;
}

const getTicker24h = async (symbol) => {
    const normalizedSymbol = validateAllowedSymbol(symbol);

    const response = await axios.get(`${BINANCE_BASE_URL}/api/v3/ticker/24hr`, {
        params: { symbol: normalizedSymbol },
        timeout: 10000
    });

    return {
        symbol: response.data.symbol,
        price: parseFloat(response.data.lastPrice),
        priceChangePercent: parseFloat(response.data.priceChangePercent),
        volume: parseFloat(response.data.volume),
        quoteVolume: parseFloat(response.data.quoteVolume),
        highPrice: parseFloat(response.data.highPrice),
        lowPrice: parseFloat(response.data.lowPrice),
        source: 'Binance API',
        timestamp: new Date()
    };
};

module.exports = {
    getAllowedSymbols,
    getTicker24h
};


