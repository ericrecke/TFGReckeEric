const Analysis = require('../models/Analysis');
const RiskParameters = require('../models/RiskParameters');
const Recommendation = require('../models/Recommendation');
const MarketData = require('../models/MarketData');
const Indicator = require('../models/Indicator');
const marketService = require('../services/market.service');
const indicatorService = require('../services/indicator.service');

const getRiskLevel = (maxRiskPercent) => {
    if (maxRiskPercent <= 1) {
        return 'Bajo';
    }

    if (maxRiskPercent <= 3) {
        return 'Medio';
    }

    return 'Alto';
};

const getRecommendation = ({
    marketData,
    indicator,
    strategy,
    maxRiskPercent,
    stopLossPercent,
    takeProfitPercent
}) => {
    const change = marketData?.priceChangePercent || 0;
    const rsi = indicator?.rsi;
    const sma = indicator?.sma;
    const ema = indicator?.ema;
    const riskLevel = getRiskLevel(maxRiskPercent);
    const riskRewardRatio = Number(stopLossPercent) > 0
        ? Number(takeProfitPercent) / Number(stopLossPercent)
        : 0;
    const hasFavorableRisk = riskRewardRatio >= 1.5 && Number(maxRiskPercent) <= 3;
    const isTrendPositive = change > 1 || (ema !== null && sma !== null && ema !== undefined && sma !== undefined && ema > sma);
    const isTrendNegative = change < -1 || (ema !== null && sma !== null && ema !== undefined && sma !== undefined && ema < sma);

    if (rsi !== null && rsi !== undefined && rsi >= 70) {
        return {
            result: strategy === 'mean-reversion' && hasFavorableRisk ? 'VENDER' : 'ESPERAR',
            confidencePercent: strategy === 'mean-reversion' ? 78 : 70,
            riskLevel,
            reason: strategy === 'mean-reversion'
                ? 'El RSI indica sobrecompra. Para una estrategia de reversion, puede evaluarse salida o venta con riesgo controlado.'
                : 'El activo presenta fuerza alcista, pero el RSI esta cerca de sobrecompra. Conviene esperar confirmacion.'
        };
    }

    if (rsi !== null && rsi !== undefined && rsi <= 30) {
        return {
            result: strategy === 'mean-reversion' && hasFavorableRisk ? 'COMPRAR' : 'ESPERAR',
            confidencePercent: strategy === 'mean-reversion' ? 76 : 64,
            riskLevel,
            reason: strategy === 'mean-reversion'
                ? 'El RSI indica sobreventa. La estrategia de reversion habilita una compra si el riesgo configurado es aceptable.'
                : 'El activo esta en zona de sobreventa, pero falta confirmacion para una entrada segun la estrategia seleccionada.'
        };
    }

    if (strategy === 'trend' && isTrendPositive && hasFavorableRisk) {
        return {
            result: 'COMPRAR',
            confidencePercent: Math.min(88, Math.round(62 + Math.abs(change) * 4)),
            riskLevel,
            reason: 'La tendencia reciente es positiva y la relacion take profit / stop loss es favorable para una entrada controlada.'
        };
    }

    if (strategy === 'trend' && isTrendNegative) {
        return {
            result: 'VENDER',
            confidencePercent: Math.min(85, Math.round(60 + Math.abs(change) * 4)),
            riskLevel,
            reason: 'La tendencia reciente es negativa. Se recomienda salida o venta antes de asumir una entrada alcista.'
        };
    }

    if (strategy === 'breakout' && Math.abs(change) >= 2 && hasFavorableRisk) {
        return {
            result: change > 0 ? 'COMPRAR' : 'VENDER',
            confidencePercent: Math.min(86, Math.round(58 + Math.abs(change) * 5)),
            riskLevel,
            reason: change > 0
                ? 'El activo muestra impulso suficiente para una estrategia de ruptura alcista.'
                : 'El activo muestra ruptura bajista. La recomendacion favorece venta o evitar posicion compradora.'
        };
    }

    if (!hasFavorableRisk) {
        return {
            result: 'ESPERAR',
            confidencePercent: 58,
            riskLevel,
            reason: 'Los parametros de riesgo no ofrecen una relacion beneficio/riesgo suficiente. Ajuste stop loss, take profit o riesgo maximo.'
        };
    }

    return {
        result: change > 0 ? 'COMPRAR' : change < 0 ? 'VENDER' : 'ESPERAR',
        confidencePercent: Math.max(35, Math.min(90, Math.round(50 + Math.abs(change) * 6))),
        riskLevel,
        reason: change > 0
            ? 'El activo mantiene variacion positiva y los parametros de riesgo permiten una operacion controlada.'
            : change < 0
                ? 'La variacion reciente es negativa. La recomendacion favorece proteger capital o evitar compra.'
                : 'No hay suficiente confirmacion direccional. Se recomienda observar antes de operar.'
    };
};

const validateRiskParameters = ({ capital, maxRiskPercent, stopLossPercent, takeProfitPercent }) => {
    if ([capital, maxRiskPercent, stopLossPercent, takeProfitPercent].some((value) => value === undefined || Number(value) < 0)) {
        return 'Los parametros de riesgo deben ser numeros mayores o iguales a cero';
    }

    if (Number(maxRiskPercent) > 100) {
        return 'El riesgo maximo no puede superar el 100%';
    }

    return null;
};

const getRiskParameters = async (req, res) => {
    try {
        const { symbol } = req.params;

        if (!symbol) {
            return res.status(400).json({ message: 'Symbol is required' });
        }

        const normalizedSymbol = String(symbol).toUpperCase();
        const parameters = await RiskParameters.findOne({
            user: req.user._id,
            symbol: normalizedSymbol
        });

        if (parameters) {
            return res.json({
                message: 'Risk parameters fetched successfully',
                data: parameters
            });
        }

        return res.json({
            message: 'Default risk parameters returned',
            data: {
                symbol: normalizedSymbol,
                timeframe: '1H',
                strategy: 'trend',
                capital: 1000,
                maxRiskPercent: 2,
                stopLossPercent: 3,
                takeProfitPercent: 6
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Error fetching risk parameters',
            error: error.message
        });
    }
};

const saveRiskParameters = async (req, res) => {
    try {
        const {
            symbol,
            timeframe,
            strategy,
            capital,
            maxRiskPercent,
            stopLossPercent,
            takeProfitPercent
        } = req.body;

        if (!symbol || !timeframe || !strategy) {
            return res.status(400).json({ message: 'Symbol, timeframe and strategy are required' });
        }

        const validationError = validateRiskParameters({ capital, maxRiskPercent, stopLossPercent, takeProfitPercent });

        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const parameters = await RiskParameters.findOneAndUpdate(
            {
                userId: req.user._id,
                user: req.user._id,
                symbol: String(symbol).toUpperCase()
            },
            {
                userId: req.user._id,
                user: req.user._id,
                symbol: String(symbol).toUpperCase(),
                timeframe,
                strategy,
                capitalAmount: capital,
                capital,
                maxRiskPercent,
                stopLossPercent,
                takeProfitPercent
            },
            {
                new: true,
                upsert: true,
                runValidators: true
            }
        );

        return res.json({
            message: 'Risk parameters saved successfully',
            data: parameters
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Error saving risk parameters',
            error: error.message
        });
    }
};

const generateAnalysis = async (req, res) => {
    try {
        const {
            symbol,
            timeframe,
            strategy,
            capital,
            maxRiskPercent,
            stopLossPercent,
            takeProfitPercent
        } = req.body;

        if (!symbol || !timeframe || !strategy) {
            return res.status(400).json({ message: 'Symbol, timeframe and strategy are required' });
        }

        const validationError = validateRiskParameters({ capital, maxRiskPercent, stopLossPercent, takeProfitPercent });

        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const normalizedSymbol = String(symbol).toUpperCase();
        const ticker = await marketService.getTicker24h(normalizedSymbol);
        const marketData = await MarketData.create(ticker);
        const indicator = await indicatorService.calculateAndSaveIndicators(marketData);

        const riskParameters = {
            capitalAmount: capital,
            capital,
            maxRiskPercent,
            stopLossPercent,
            takeProfitPercent
        };

        const recommendation = getRecommendation({
            marketData,
            indicator,
            strategy,
            maxRiskPercent,
            stopLossPercent,
            takeProfitPercent
        });

        const analysis = await Analysis.create({
            user: req.user._id,
            symbol: normalizedSymbol,
            timeframe,
            strategy,
            marketData: marketData._id,
            indicator: indicator?._id,
            riskParameters,
            recommendation
        });

        const recommendationRecord = await Recommendation.create({
            userId: req.user._id,
            user: req.user._id,
            analysis: analysis._id,
            symbol: normalizedSymbol,
            recommendationType: recommendation.result,
            confidence: recommendation.confidencePercent,
            ...recommendation
        });

        analysis.recommendationRecord = recommendationRecord._id;
        await analysis.save();

        return res.status(201).json({
            message: 'Analysis generated successfully',
            data: analysis,
            marketData,
            indicator,
            recommendation: recommendationRecord
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Error generating analysis',
            error: error.message
        });
    }
};

module.exports = {
    getRiskParameters,
    saveRiskParameters,
    generateAnalysis
};
