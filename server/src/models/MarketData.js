const mongoose = require('mongoose');

const marketDataSchema = new mongoose.Schema({
    symbol: { type: String, required: true, uppercase: true },
    price: { type: Number, required: true },
    changePercent: { type: Number, default: 0 },
    priceChangePercent: { type: Number, default: 0 },
    volume: { type: Number, default: 0 },
    quoteVolume: { type: Number, default: 0 },
    highPrice: { type: Number, default: 0 },
    lowPrice: { type: Number, default: 0 },
    source: { type: String, default: 'Binance API' },
    timestamp: { type: Date, default: Date.now }
},
    {
        timestamps: true
    }
);

module.exports = mongoose.model('MarketData', marketDataSchema, 'market_data');
