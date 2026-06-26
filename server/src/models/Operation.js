const mongoose = require('mongoose');

const operationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        symbol: { type: String, required: true, uppercase: true, index: true },
        operationType: {
            type: String,
            enum: ['compra', 'venta'],
            required: true
        },
        entryPrice: { type: Number, required: true },
        exitPrice: { type: Number, default: null },
        amount: { type: Number, required: true },
        status: {
            type: String,
            enum: ['abierta', 'cerrada', 'en seguimiento'],
            default: 'abierta'
        },
        result: { type: Number, default: null },
        closedAt: { type: Date, default: null }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Operation', operationSchema, 'operations');
