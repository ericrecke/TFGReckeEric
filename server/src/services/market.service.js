const axios = require('axios');
const MarketSymbol = require('../models/MarketSymbol');

const BINANCE_BASE_URL = process.env.BINANCE_BASE_URL || 'https://api.binance.com';
const SYMBOL_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;
const watchlistSymbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT'];
const popularSymbols = [
    'BTCUSDT',
    'ETHUSDT',
    'BNBUSDT',
    'SOLUSDT',
    'XRPUSDT',
    'ADAUSDT',
    'DOGEUSDT',
    'TRXUSDT',
    'LINKUSDT',
    'AVAXUSDT',
    'DOTUSDT',
    'LTCUSDT',
    'BCHUSDT',
    'TONUSDT'
];
let symbolSyncPromise = null;
let lastSymbolSyncAt = 0;

const normalizeSymbol = (symbol) => {
    return String(symbol || '').trim().toUpperCase();
}

const syncSymbolCatalog = async () => {
    if (symbolSyncPromise) {
        return symbolSyncPromise;
    }

    symbolSyncPromise = (async () => {
        const [exchangeResponse, tickerResponse] = await Promise.all([
            axios.get(`${BINANCE_BASE_URL}/api/v3/exchangeInfo`, {
                timeout: 15000
            }),
            axios.get(`${BINANCE_BASE_URL}/api/v3/ticker/24hr`, {
                timeout: 15000
            })
        ]);
        const syncedAt = new Date();
        const volumeBySymbol = new Map(
            tickerResponse.data.map((ticker) => [
                ticker.symbol,
                Number(ticker.quoteVolume) || 0
            ])
        );
        const activeSymbols = exchangeResponse.data.symbols.filter((item) => {
            return item.status === 'TRADING' &&
                item.quoteAsset === 'USDT' &&
                item.isSpotTradingAllowed !== false;
        });
        activeSymbols.sort((left, right) => {
            const leftPriority = popularSymbols.indexOf(left.symbol);
            const rightPriority = popularSymbols.indexOf(right.symbol);

            if (leftPriority !== -1 || rightPriority !== -1) {
                if (leftPriority === -1) {
                    return 1;
                }

                if (rightPriority === -1) {
                    return -1;
                }

                return leftPriority - rightPriority;
            }

            return (volumeBySymbol.get(right.symbol) || 0) -
                (volumeBySymbol.get(left.symbol) || 0);
        });
        const symbolNames = activeSymbols.map((item) => item.symbol);

        if (activeSymbols.length) {
            await MarketSymbol.bulkWrite(
                activeSymbols.map((item, index) => ({
                    updateOne: {
                        filter: { symbol: item.symbol },
                        update: {
                            $set: {
                                symbol: item.symbol,
                                baseAsset: item.baseAsset,
                                quoteAsset: item.quoteAsset,
                                status: item.status,
                                isSpotTradingAllowed: item.isSpotTradingAllowed !== false,
                                quoteVolume24h: volumeBySymbol.get(item.symbol) || 0,
                                popularityRank: index + 1,
                                source: 'Binance API',
                                syncedAt
                            }
                        },
                        upsert: true
                    }
                })),
                { ordered: false }
            );

            await MarketSymbol.updateMany(
                {
                    quoteAsset: 'USDT',
                    symbol: { $nin: symbolNames }
                },
                {
                    $set: {
                        status: 'INACTIVE',
                        isSpotTradingAllowed: false,
                        syncedAt
                    }
                }
            );
        }

        lastSymbolSyncAt = Date.now();
        return activeSymbols.length;
    })().finally(() => {
        symbolSyncPromise = null;
    });

    return symbolSyncPromise;
};

const ensureSymbolCatalog = async () => {
    const hasFreshInMemoryCatalog =
        lastSymbolSyncAt &&
        Date.now() - lastSymbolSyncAt < SYMBOL_SYNC_INTERVAL_MS;

    if (hasFreshInMemoryCatalog) {
        return;
    }

    const latestSymbol = await MarketSymbol.findOne({
        status: 'TRADING',
        quoteAsset: 'USDT'
    }).sort({ syncedAt: -1 });
    const isDatabaseCatalogFresh =
        latestSymbol?.syncedAt &&
        Date.now() - latestSymbol.syncedAt.getTime() < SYMBOL_SYNC_INTERVAL_MS;

    if (isDatabaseCatalogFresh) {
        lastSymbolSyncAt = latestSymbol.syncedAt.getTime();
        return;
    }

    await syncSymbolCatalog();
};

const validateAllowedSymbol = async (symbol) => {
    const normalizedSymbol = normalizeSymbol(symbol);

    await ensureSymbolCatalog();
    const exists = await MarketSymbol.exists({
        symbol: normalizedSymbol,
        quoteAsset: 'USDT',
        status: 'TRADING',
        isSpotTradingAllowed: true
    });

    if (!exists) {
        throw new Error(`Symbol ${normalizedSymbol} is not available for Spot trading against USDT`);
    }

    return normalizedSymbol;
};

const getAllowedSymbols = async () => {
    await ensureSymbolCatalog();

    const symbols = await MarketSymbol.find({
        quoteAsset: 'USDT',
        status: 'TRADING',
        isSpotTradingAllowed: true
    })
        .sort({ popularityRank: 1, quoteVolume24h: -1, baseAsset: 1 })
        .select({ symbol: 1, _id: 0 })
        .lean();

    return symbols.map((item) => item.symbol);
}

const getTicker24h = async (symbol) => {
    const normalizedSymbol = await validateAllowedSymbol(symbol);

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
            symbols: JSON.stringify(watchlistSymbols)
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
    const normalizedSymbol = await validateAllowedSymbol(symbol);
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
    getCandles,
    syncSymbolCatalog
};


