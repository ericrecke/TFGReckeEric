const Operation = require('../models/Operation');
const marketService = require('../services/market.service');

const calculateResult = ({ operationType, entryPrice, exitPrice, amount }) => {
    const entry = Number(entryPrice);
    const exit = Number(exitPrice);
    const quantity = Number(amount);

    if (operationType === 'venta') {
        return (entry - exit) * quantity;
    }

    return (exit - entry) * quantity;
};

const enrichOperation = async (operation) => {
    const data = operation.toObject();

    if (data.status === 'cerrada') {
        return data;
    }

    try {
        const ticker = await marketService.getTicker24h(data.symbol);
        data.currentPrice = ticker.price;
        data.currentResult = calculateResult({
            operationType: data.operationType,
            entryPrice: data.entryPrice,
            exitPrice: ticker.price,
            amount: data.amount
        });
    } catch (error) {
        data.currentPrice = null;
        data.currentResult = null;
    }

    return data;
};

const getOperations = async (req, res) => {
    try {
        const { status, symbol } = req.query;
        const filters = {
            userId: req.user._id
        };

        if (status) {
            filters.status = String(status).toLowerCase();
        }

        if (symbol) {
            filters.symbol = String(symbol).toUpperCase();
        }

        const operations = await Operation.find(filters).sort({ createdAt: -1 });
        const data = await Promise.all(operations.map(enrichOperation));

        return res.json({
            message: 'Operations fetched successfully',
            count: data.length,
            data
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Error fetching operations',
            error: error.message
        });
    }
};

const createOperation = async (req, res) => {
    try {
        const {
            symbol,
            operationType,
            entryPrice,
            amount
        } = req.body;

        if (!symbol || !operationType || entryPrice === undefined || amount === undefined) {
            return res.status(400).json({
                message: 'Symbol, operationType, entryPrice and amount are required'
            });
        }

        if (!['compra', 'venta'].includes(operationType)) {
            return res.status(400).json({ message: 'operationType must be compra or venta' });
        }

        if (Number(entryPrice) <= 0 || Number(amount) <= 0) {
            return res.status(400).json({ message: 'entryPrice and amount must be greater than zero' });
        }

        const operation = await Operation.create({
            userId: req.user._id,
            symbol: String(symbol).toUpperCase(),
            operationType,
            entryPrice: Number(entryPrice),
            amount: Number(amount),
            status: 'abierta'
        });

        return res.status(201).json({
            message: 'Operation created successfully',
            data: operation
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Error creating operation',
            error: error.message
        });
    }
};

const closeOperation = async (req, res) => {
    try {
        const { exitPrice } = req.body;

        if (exitPrice === undefined || Number(exitPrice) <= 0) {
            return res.status(400).json({ message: 'exitPrice must be greater than zero' });
        }

        const operation = await Operation.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!operation) {
            return res.status(404).json({ message: 'Operation not found' });
        }

        if (operation.status === 'cerrada') {
            return res.status(400).json({ message: 'Operation is already closed' });
        }

        operation.exitPrice = Number(exitPrice);
        operation.result = calculateResult({
            operationType: operation.operationType,
            entryPrice: operation.entryPrice,
            exitPrice: operation.exitPrice,
            amount: operation.amount
        });
        operation.status = 'cerrada';
        operation.closedAt = new Date();

        await operation.save();

        return res.json({
            message: 'Operation closed successfully',
            data: operation
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Error closing operation',
            error: error.message
        });
    }
};

module.exports = {
    getOperations,
    createOperation,
    closeOperation
};
