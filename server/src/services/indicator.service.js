const Indicator = require('../models/Indicator');
const MarketData = require('../models/MarketData');

const DEFAULT_PERIOD = 14;

const roundIndicator = (value) => {
    if (value === null || Number.isNaN(value)) {
        return null;
    }

    return Number(value.toFixed(4));
};

const calculateSma = (prices, period) => {
    if (prices.length < period) {
        return null;
    }

    const sample = prices.slice(-period);
    const total = sample.reduce((sum, price) => sum + price, 0);
    return total / period;
};

const calculateEma = (prices, period) => {
    if (prices.length < period) {
        return null;
    }

    const multiplier = 2 / (period + 1);
    const firstSample = prices.slice(0, period);
    let ema = firstSample.reduce((sum, price) => sum + price, 0) / period;

    for (const price of prices.slice(period)) {
        ema = (price - ema) * multiplier + ema;
    }

    return ema;
};

const calculateRsi = (prices, period) => {
    if (prices.length <= period) {
        return null;
    }

    const sample = prices.slice(-(period + 1));
    let gains = 0;
    let losses = 0;

    for (let index = 1; index < sample.length; index += 1) {
        const difference = sample[index] - sample[index - 1];

        if (difference >= 0) {
            gains += difference;
        } else {
            losses += Math.abs(difference);
        }
    }

    const averageGain = gains / period;
    const averageLoss = losses / period;

    if (averageLoss === 0) {
        return 100;
    }

    const relativeStrength = averageGain / averageLoss;
    return 100 - (100 / (1 + relativeStrength));
};

const calculateAndSaveIndicators = async (marketData, period = DEFAULT_PERIOD) => {
    const symbol = String(marketData.symbol).toUpperCase();
    const history = await MarketData.find({ symbol })
        .sort({ timestamp: 1 })
        .limit(100);

    const prices = history.map((item) => item.price);

    const indicator = await Indicator.create({
        symbol,
        marketData: marketData._id,
        sma: roundIndicator(calculateSma(prices, period)),
        ema: roundIndicator(calculateEma(prices, period)),
        rsi: roundIndicator(calculateRsi(prices, period)),
        period,
        timestamp: marketData.timestamp
    });

    return indicator;
};

module.exports = {
    calculateAndSaveIndicators
};
