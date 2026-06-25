const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema(
    {
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
        result: { type: String, enum: ['COMPRAR', 'ESPERAR', 'VENDER'], required: true },
        confidencePercent: { type: Number, required: true },
        riskLevel: { type: String, enum: ['Bajo', 'Medio', 'Alto'], required: true },
        reason: { type: String, required: true },
        disclaimer: {
            type: String,
            default: 'La recomendacion es orientativa. La decision final corresponde al usuario.'
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Recommendation', recommendationSchema);
