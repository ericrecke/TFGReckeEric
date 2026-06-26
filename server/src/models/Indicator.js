const mongoose = require('mongoose');

const indicatorSchema = new mongoose.Schema(
    {
        symbol: { type: String, required: true, uppercase: true, index: true },
        marketData: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MarketData',
            required: true
        },
        sma: { type: Number, default: null },
        ema: { type: Number, default: null },
        rsi: { type: Number, default: null },
        macd: { type: Number, default: null },
        movingAverage: { type: Number, default: null },
        period: { type: String, default: '14' },
        source: { type: String, default: 'internal-calculation' },
        timestamp: { type: Date, default: Date.now }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Indicator', indicatorSchema, 'indicators');
