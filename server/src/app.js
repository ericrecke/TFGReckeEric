const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const marketRoutes = require('./routes/market.routes');
const analysisRoutes = require('./routes/analysis.routes');
const recommendationRoutes = require('./routes/recommendation.routes');
const operationRoutes = require('./routes/operation.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Crypto Decision Support API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/operations', operationRoutes);

module.exports = app;
