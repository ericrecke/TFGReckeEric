const Recommendation = require('../models/Recommendation');

const populateRecommendationContext = (query) => {
    return query.populate({
        path: 'analysis',
        select: 'timeframe strategy riskParameters indicator marketData createdAt',
        populate: [
            {
                path: 'indicator',
                select: 'sma ema rsi macd period source timestamp'
            },
            {
                path: 'marketData',
                select: 'symbol price priceChangePercent volume highPrice lowPrice source timestamp'
            }
        ]
    });
};

const getRecommendations = async (req, res) => {
    try {
        const { symbol, type } = req.query;
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(20, Math.max(1, Number.parseInt(req.query.limit, 10) || 8));
        const filters = {
            user: req.user._id
        };

        if (symbol) {
            filters.symbol = String(symbol).toUpperCase();
        }

        if (type) {
            const normalizedType = String(type).toUpperCase();
            filters.$or = [
                {
                    riskOverride: { $ne: true },
                    'machineLearning.predictedResult': normalizedType
                },
                {
                    riskOverride: true,
                    recommendationType: normalizedType
                },
                {
                    machineLearning: null,
                    recommendationType: normalizedType
                }
            ];
        }

        const [recommendations, total, summaryResult] = await Promise.all([
            populateRecommendationContext(Recommendation.find(filters))
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            Recommendation.countDocuments(filters),
            Recommendation.aggregate([
                { $match: filters },
                {
                    $addFields: {
                        effectiveResult: {
                            $cond: [
                                { $eq: ['$riskOverride', true] },
                                '$recommendationType',
                                {
                                    $ifNull: [
                                        '$machineLearning.predictedResult',
                                        '$recommendationType'
                                    ]
                                }
                            ]
                        },
                        effectiveConfidence: {
                            $ifNull: ['$machineLearning.confidencePercent', '$confidencePercent']
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        buy: {
                            $sum: { $cond: [{ $eq: ['$effectiveResult', 'COMPRAR'] }, 1, 0] }
                        },
                        sell: {
                            $sum: { $cond: [{ $eq: ['$effectiveResult', 'VENDER'] }, 1, 0] }
                        },
                        hold: {
                            $sum: { $cond: [{ $eq: ['$effectiveResult', 'ESPERAR'] }, 1, 0] }
                        },
                        averageConfidence: { $avg: '$effectiveConfidence' }
                    }
                }
            ])
        ]);
        const summary = summaryResult[0] || {
            buy: 0,
            sell: 0,
            hold: 0,
            averageConfidence: 0
        };

        return res.json({
            message: 'Recommendations fetched successfully',
            count: total,
            data: recommendations,
            summary: {
                buy: summary.buy,
                sell: summary.sell,
                hold: summary.hold,
                averageConfidence: Math.round(summary.averageConfidence || 0)
            },
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit))
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Error fetching recommendations',
            error: error.message
        });
    }
};

const getRecommendationById = async (req, res) => {
    try {
        const recommendation = await populateRecommendationContext(Recommendation.findOne({
            _id: req.params.id,
            user: req.user._id
        }));

        if (!recommendation) {
            return res.status(404).json({ message: 'Recommendation not found' });
        }

        return res.json({
            message: 'Recommendation fetched successfully',
            data: recommendation
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Error fetching recommendation',
            error: error.message
        });
    }
};

module.exports = {
    getRecommendations,
    getRecommendationById
};
