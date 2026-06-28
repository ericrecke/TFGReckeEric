require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../src/models/User');

const promoteAdmin = async () => {
    const email = String(process.argv[2] || '').trim().toLowerCase();

    if (!email) {
        throw new Error('Usage: npm run user:promote -- user@example.com');
    }

    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is not configured');
    }

    await mongoose.connect(process.env.MONGO_URI);

    const user = await User.findOneAndUpdate(
        { email },
        { role: 'admin', status: 'active' },
        { new: true, runValidators: true }
    ).select('name email role status');

    if (!user) {
        throw new Error(`User not found: ${email}`);
    }

    console.log(`Administrator enabled: ${user.email}`);
};

promoteAdmin()
    .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
