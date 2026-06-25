const mongoose = require('mongoose');

const riskParametersSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        symbol: { type: String, required: true, uppercase: true, index: true },
        timeframe: { type: String, required: true },
        strategy: { type: String, required: true },
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

module.exports = mongoose.model('RiskParameters', riskParametersSchema);
