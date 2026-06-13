const app = require('./src/app');
const connectDatabase = require('./src/config/database');

require('dotenv').config();

const PORT = process.env.PORT || 3000;

connectDatabase();

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
