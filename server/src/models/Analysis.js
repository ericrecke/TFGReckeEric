const mongoose = require('mongoose');

const riskParametersSchema = new mongoose.Schema(
    {
        capital: { type: Number, required: true },
        maxRiskPercent: { type: Number, required: true },
        stopLossPercent: { type: Number, required: true },
        takeProfitPercent: { type: Number, required: true }
    },
    { _id: false }
);

const machineLearningSchema = new mongoose.Schema(
    {
        predictedResult: {
            type: String,
            enum: ['COMPRAR', 'ESPERAR', 'VENDER'],
            required: true
        },
        confidencePercent: { type: Number, required: true },
        probabilities: {
            sell: { type: Number, required: true },
            hold: { type: Number, required: true },
            buy: { type: Number, required: true }
        },
        model: { type: String, required: true },
        trainingSamples: { type: Number, required: true }
    },
    { _id: false }
);

const recommendationSchema = new mongoose.Schema(
    {
        result: { type: String, enum: ['COMPRAR', 'ESPERAR', 'VENDER'], required: true },
        confidencePercent: { type: Number, required: true },
        riskLevel: { type: String, enum: ['Bajo', 'Medio', 'Alto'], required: true },
        reason: { type: String, required: true },
        riskOverride: { type: Boolean, default: false },
        machineLearning: { type: machineLearningSchema, default: null }
    },
    { _id: false }
);

const analysisSchema = new mongoose.Schema(
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
        marketData: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MarketData'
        },
        indicator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Indicator'
        },
        riskParameters: { type: riskParametersSchema, required: true },
        recommendationRecord: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Recommendation'
        },
        recommendation: { type: recommendationSchema, required: true }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Analysis', analysisSchema);
