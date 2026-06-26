const mongoose = require('mongoose');

const riskParametersSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        symbol: { type: String, required: true, uppercase: true, index: true },
        timeframe: { type: String, required: true },
        strategy: { type: String, required: true },
        capitalAmount: { type: Number, required: true },
        capital: { type: Number, required: true },
        maxRiskPercent: { type: Number, required: true },
        stopLossPercent: { type: Number, required: true },
        takeProfitPercent: { type: Number, required: true }
    },
    {
        timestamps: true
    }
);

riskParametersSchema.index({ user: 1, symbol: 1 }, { unique: true });
riskParametersSchema.index({ userId: 1, symbol: 1 });

module.exports = mongoose.model('RiskParameters', riskParametersSchema, 'risk_settings');
