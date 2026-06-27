const tf = require('@tensorflow/tfjs');

const MODEL_TTL_MS = 15 * 60 * 1000;
const MIN_TRAINING_SAMPLES = 50;
const cache = new Map();

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const average = (values) => {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const getFeatures = (prices, index) => {
    const current = prices[index];
    const previous = prices[index - 1];
    const fivePeriodsAgo = prices[index - 5];
    const shortWindow = prices.slice(index - 4, index + 1);
    const longWindow = prices.slice(index - 19, index + 1);
    const returns = longWindow.slice(1).map((price, returnIndex) => {
        return (price / longWindow[returnIndex]) - 1;
    });
    const averageReturn = average(returns);
    const variance = average(returns.map((value) => (value - averageReturn) ** 2));

    return [
        clamp(((current / previous) - 1) * 100, -10, 10),
        clamp(((current / fivePeriodsAgo) - 1) * 100, -20, 20),
        clamp(((current / average(shortWindow)) - 1) * 100, -10, 10),
        clamp(((current / average(longWindow)) - 1) * 100, -20, 20),
        clamp(Math.sqrt(variance) * 100, 0, 10)
    ];
};

const createTrainingSet = (prices) => {
    const inputs = [];
    const labels = [];

    for (let index = 20; index < prices.length - 1; index += 1) {
        const features = getFeatures(prices, index);
        const futureReturn = ((prices[index + 1] / prices[index]) - 1) * 100;
        const threshold = clamp(features[4] * 0.35, 0.1, 2);

        inputs.push(features);
        labels.push(futureReturn > threshold ? 2 : futureReturn < -threshold ? 0 : 1);
    }

    return { inputs, labels };
};

const createModel = () => {
    const model = tf.sequential();
    model.add(tf.layers.dense({
        inputShape: [5],
        units: 12,
        activation: 'relu',
        kernelInitializer: tf.initializers.glorotUniform({ seed: 42 })
    }));
    model.add(tf.layers.dense({
        units: 3,
        activation: 'softmax',
        kernelInitializer: tf.initializers.glorotUniform({ seed: 43 })
    }));
    model.compile({
        optimizer: tf.train.adam(0.01),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
    });
    return model;
};

const trainModel = async (prices) => {
    const { inputs, labels } = createTrainingSet(prices);

    if (inputs.length < MIN_TRAINING_SAMPLES) {
        return null;
    }

    const model = createModel();
    const inputTensor = tf.tensor2d(inputs);
    const labelIndexes = tf.tensor1d(labels, 'int32');
    const labelTensor = tf.oneHot(labelIndexes, 3);

    try {
        await model.fit(inputTensor, labelTensor, {
            epochs: 20,
            batchSize: 32,
            shuffle: false,
            verbose: 0
        });
    } finally {
        inputTensor.dispose();
        labelIndexes.dispose();
        labelTensor.dispose();
    }

    return model;
};

const getModel = async (cacheKey, prices) => {
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.trainedAt < MODEL_TTL_MS) {
        return cached.model;
    }

    cached?.model.dispose();
    const model = await trainModel(prices);

    if (model) {
        cache.set(cacheKey, {
            model,
            trainedAt: Date.now()
        });
    }

    return model;
};

const predictMarketDirection = async ({ symbol, timeframe, candles }) => {
    const prices = candles
        .map((candle) => Number(candle.close))
        .filter((price) => Number.isFinite(price) && price > 0);

    if (prices.length < 72) {
        return null;
    }

    const model = await getModel(`${symbol}:${timeframe}`, prices);

    if (!model) {
        return null;
    }

    const inputTensor = tf.tensor2d([getFeatures(prices, prices.length - 1)]);
    const predictionTensor = model.predict(inputTensor);
    const probabilities = Array.from(await predictionTensor.data());
    inputTensor.dispose();
    predictionTensor.dispose();

    const labels = ['VENDER', 'ESPERAR', 'COMPRAR'];
    const predictedIndex = probabilities.indexOf(Math.max(...probabilities));

    return {
        predictedResult: labels[predictedIndex],
        confidencePercent: Math.round(probabilities[predictedIndex] * 100),
        probabilities: {
            sell: Number((probabilities[0] * 100).toFixed(2)),
            hold: Number((probabilities[1] * 100).toFixed(2)),
            buy: Number((probabilities[2] * 100).toFixed(2))
        },
        model: 'dss-predictive-v1',
        trainingSamples: prices.length - 21
    };
};

module.exports = {
    predictMarketDirection
};
