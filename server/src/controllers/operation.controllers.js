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

const buildOperationMetrics = (data, referencePrice, resultType) => {
    const entryPrice = Number(data.entryPrice);
    const amount = Number(data.amount);
    const investedAmount = entryPrice * amount;
    const profitLoss = referencePrice === null
        ? null
        : calculateResult({
            operationType: data.operationType,
            entryPrice,
            exitPrice: referencePrice,
            amount
        });
    const profitLossPercent = profitLoss === null || investedAmount === 0
        ? null
        : (profitLoss / investedAmount) * 100;
    const priceVariationPercent = referencePrice === null || entryPrice === 0
        ? null
        : ((referencePrice - entryPrice) / entryPrice) * 100;
    const endTime = data.closedAt ? new Date(data.closedAt).getTime() : Date.now();

    return {
        investedAmount,
        referencePrice,
        positionValue: referencePrice === null ? null : referencePrice * amount,
        profitLoss,
        profitLossPercent,
        priceVariationPercent,
        resultType,
        holdingTimeMs: Math.max(0, endTime - new Date(data.createdAt).getTime())
    };
};

const enrichOperation = (operation, tickerBySymbol) => {
    const data = operation.toObject();

    if (data.status === 'cerrada') {
        const metrics = buildOperationMetrics(data, Number(data.exitPrice), 'realized');
        return {
            ...data,
            ...metrics,
            result: data.result ?? metrics.profitLoss
        };
    }

    const ticker = tickerBySymbol.get(data.symbol);
    const currentPrice = ticker?.price ?? null;
    const metrics = buildOperationMetrics(data, currentPrice, 'unrealized');

    return {
        ...data,
        ...metrics,
        currentPrice,
        currentResult: metrics.profitLoss
    };
};

const getOperations = async (req, res) => {
    try {
        const { status, symbol, dateFrom, dateTo } = req.query;
        const filters = {
            userId: req.user._id
        };

        if (status) {
            filters.status = String(status).toLowerCase();
        }

        if (symbol) {
            filters.symbol = String(symbol).toUpperCase();
        }

        if (dateFrom || dateTo) {
            filters.createdAt = {};

            if (dateFrom) {
                filters.createdAt.$gte = new Date(dateFrom);
            }

            if (dateTo) {
                const endDate = new Date(dateTo);
                endDate.setHours(23, 59, 59, 999);
                filters.createdAt.$lte = endDate;
            }
        }

        const operations = await Operation.find(filters).sort({ createdAt: -1 });
        const openSymbols = operations
            .filter((operation) => operation.status !== 'cerrada')
            .map((operation) => operation.symbol);
        let tickerBySymbol = new Map();

        if (openSymbols.length) {
            try {
                const tickers = await marketService.getTickers24h(openSymbols);
                tickerBySymbol = new Map(
                    tickers.map((ticker) => [ticker.symbol, ticker])
                );
            } catch (error) {
                console.error('Error refreshing operation prices:', error.message);
            }
        }

        const data = operations.map((operation) => {
            return enrichOperation(operation, tickerBySymbol);
        });
        const summary = data.reduce((totals, operation) => {
            if (operation.status === 'cerrada') {
                totals.closedCount += 1;
                totals.realizedResult += operation.profitLoss ?? 0;
            } else {
                totals.openCount += 1;
                totals.investedCapitalOpen += operation.investedAmount ?? 0;
                totals.unrealizedResult += operation.profitLoss ?? 0;
            }

            return totals;
        }, {
            openCount: 0,
            closedCount: 0,
            investedCapitalOpen: 0,
            unrealizedResult: 0,
            realizedResult: 0
        });

        return res.json({
            message: 'Operations fetched successfully',
            count: data.length,
            data,
            summary: {
                ...summary,
                totalResult: summary.realizedResult + summary.unrealizedResult,
                updatedAt: new Date()
            }
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
