const { EMA, MACD, RSI, SMA } = require('technicalindicators');

const Indicator = require('../models/Indicator');
const MarketData = require('../models/MarketData');

const DEFAULT_PERIOD = 14;

const roundIndicator = (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return null;
    }

    return Number(value.toFixed(4));
};

const getLatestValue = (values) => {
    return values.length ? values[values.length - 1] : null;
};

const getStoredPrices = async (symbol) => {
    const history = await MarketData.find({ symbol })
        .sort({ timestamp: -1 })
        .limit(100);

    return history.reverse().map((item) => item.price);
};

const calculateAndSaveIndicators = async (
    marketData,
    period = DEFAULT_PERIOD,
    suppliedPrices = null
) => {
    const symbol = String(marketData.symbol).toUpperCase();
    const prices = suppliedPrices?.length
        ? suppliedPrices.map(Number).filter(Number.isFinite)
        : await getStoredPrices(symbol);

    const sma = getLatestValue(SMA.calculate({ period, values: prices }));
    const ema = getLatestValue(EMA.calculate({ period, values: prices }));
    const rsi = getLatestValue(RSI.calculate({ period, values: prices }));
    const macdResult = getLatestValue(MACD.calculate({
        values: prices,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false
    }));
    const macd = macdResult?.MACD ?? null;

    return Indicator.create({
        symbol,
        marketData: marketData._id,
        sma: roundIndicator(sma),
        ema: roundIndicator(ema),
        rsi: roundIndicator(rsi),
        macd: roundIndicator(macd),
        movingAverage: roundIndicator(sma),
        period: String(period),
        source: 'technicalindicators',
        timestamp: marketData.timestamp
    });
};

module.exports = {
    calculateAndSaveIndicators
};
