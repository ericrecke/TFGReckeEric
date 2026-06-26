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
        changePercent: parseFloat(response.data.priceChangePercent),
        priceChangePercent: parseFloat(response.data.priceChangePercent),
        volume: parseFloat(response.data.volume),
        quoteVolume: parseFloat(response.data.quoteVolume),
        highPrice: parseFloat(response.data.highPrice),
        lowPrice: parseFloat(response.data.lowPrice),
        source: 'Binance API',
        timestamp: new Date()
    };
};

const mapTickerResponse = (ticker) => ({
    symbol: ticker.symbol,
    price: parseFloat(ticker.lastPrice),
    changePercent: parseFloat(ticker.priceChangePercent),
    priceChangePercent: parseFloat(ticker.priceChangePercent),
    volume: parseFloat(ticker.volume),
    quoteVolume: parseFloat(ticker.quoteVolume),
    highPrice: parseFloat(ticker.highPrice),
    lowPrice: parseFloat(ticker.lowPrice),
    source: 'Binance API',
    timestamp: new Date()
});

const getAllowedTickers24h = async () => {
    const response = await axios.get(`${BINANCE_BASE_URL}/api/v3/ticker/24hr`, {
        params: {
            symbols: JSON.stringify(allowedSymbols)
        },
        timeout: 10000
    });

    return response.data.map(mapTickerResponse);
};

const periodIntervals = {
    '1H': '1h',
    '4H': '4h',
    '1D': '1d',
    '1W': '1w'
};

const getCandles = async (symbol, period = '1H', limit = 1000) => {
    const normalizedSymbol = validateAllowedSymbol(symbol);
    const normalizedPeriod = String(period).toUpperCase();
    const interval = periodIntervals[normalizedPeriod];

    if (!interval) {
        throw new Error('Invalid period. Allowed periods: 1H, 4H, 1D, 1W');
    }

    const normalizedLimit = Math.floor(Math.min(1000, Math.max(1, Number(limit) || 1000)));
    const response = await axios.get(`${BINANCE_BASE_URL}/api/v3/klines`, {
        params: {
            symbol: normalizedSymbol,
            interval,
            limit: normalizedLimit
        },
        timeout: 10000
    });

    return response.data.map((kline) => ({
        openTime: new Date(kline[0]),
        closeTime: new Date(kline[6]),
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5])
    }));
};

module.exports = {
    getAllowedSymbols,
    getTicker24h,
    getAllowedTickers24h,
    getCandles
};


