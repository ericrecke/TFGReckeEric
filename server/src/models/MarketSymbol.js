const mongoose = require('mongoose');

const marketSymbolSchema = new mongoose.Schema(
    {
        symbol: { type: String, required: true, unique: true, uppercase: true, index: true },
        baseAsset: { type: String, required: true, uppercase: true },
        quoteAsset: { type: String, required: true, uppercase: true, index: true },
        status: { type: String, required: true, index: true },
        isSpotTradingAllowed: { type: Boolean, default: true },
        quoteVolume24h: { type: Number, default: 0 },
        popularityRank: { type: Number, default: Number.MAX_SAFE_INTEGER, index: true },
        source: { type: String, default: 'Binance API' },
        syncedAt: { type: Date, default: Date.now }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('MarketSymbol', marketSymbolSchema, 'market_symbols');
