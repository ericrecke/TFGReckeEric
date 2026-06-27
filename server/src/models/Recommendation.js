const mongoose = require('mongoose');

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
        analysis: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Analysis'
        },
        symbol: { type: String, required: true, uppercase: true, index: true },
        recommendationType: { type: String, enum: ['COMPRAR', 'ESPERAR', 'VENDER', 'OBSERVAR'], required: true },
        result: { type: String, enum: ['COMPRAR', 'ESPERAR', 'VENDER'], required: true },
        confidence: { type: Number, required: true },
        confidencePercent: { type: Number, required: true },
        riskLevel: { type: String, enum: ['Bajo', 'Medio', 'Alto'], required: true },
        reason: { type: String, required: true },
        riskOverride: { type: Boolean, default: false },
        machineLearning: { type: machineLearningSchema, default: null },
        disclaimer: {
            type: String,
            default: 'La recomendacion es orientativa. La decision final corresponde al usuario.'
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Recommendation', recommendationSchema, 'recommendations');
