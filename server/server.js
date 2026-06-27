require('dotenv').config();

const app = require('./src/app');
const connectDatabase = require('./src/config/database');
const marketService = require('./src/services/market.service');

const PORT = process.env.PORT || 3000;
const SYMBOL_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

const startServer = async () => {
    await connectDatabase();

    try {
        const symbolCount = await marketService.syncSymbolCatalog();
        console.log(`Binance symbol catalog synchronized: ${symbolCount} active USDT pairs`);
    } catch (error) {
        console.error('Initial Binance symbol synchronization failed:', error.message);
    }

    setInterval(() => {
        marketService.syncSymbolCatalog().catch((error) => {
            console.error('Scheduled Binance symbol synchronization failed:', error.message);
        });
    }, SYMBOL_SYNC_INTERVAL_MS).unref();

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
};

startServer();
