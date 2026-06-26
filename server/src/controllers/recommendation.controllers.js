const Recommendation = require('../models/Recommendation');

const getRecommendations = async (req, res) => {
    try {
        const { symbol, type } = req.query;
        const filters = {
            user: req.user._id
        };

        if (symbol) {
            filters.symbol = String(symbol).toUpperCase();
        }

        if (type) {
            filters.recommendationType = String(type).toUpperCase();
        }

        const recommendations = await Recommendation.find(filters)
            .sort({ createdAt: -1 })
            .limit(100);

        return res.json({
            message: 'Recommendations fetched successfully',
            count: recommendations.length,
            data: recommendations
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
        const recommendation = await Recommendation.findOne({
            _id: req.params.id,
            user: req.user._id
        });

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
