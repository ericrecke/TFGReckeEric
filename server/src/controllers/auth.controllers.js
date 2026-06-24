const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

const buildAuthUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
});

const generateToken = (user) => {
    return jwt.sign({
        id: user._id,
        email: user.email,
        role: user.role
    },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
};

const generateRefreshToken = (user) => {
    return jwt.sign({
        id: user._id,
        type: 'refresh'
    },
        getRefreshSecret(),
        { expiresIn: '7d' }
    );
};

const isPasswordSecure = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};

const register = async (req, res) => {
    try {
        const { name, username, email, password } = req.body;
        const displayName = name || username;

        if (!displayName || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }

        if (!isPasswordSecure(password)) {
            return res.status(400).json({
                message: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character'
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'Email already in use' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await User.create({ name: displayName, email, passwordHash });

        return res.status(201).json({
            message: "User registered successfully",
            user: buildAuthUser(user)
        });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const login = async (req, res) => {
    try {
        const { email, username, password } = req.body;
        const loginEmail = email || username;

        if (!loginEmail || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await User.findOne({ email: loginEmail });

        if (!user) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        const passwordValid = await bcrypt.compare(password, user.passwordHash);

        if (!passwordValid) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        const token = generateToken(user);
        const refreshToken = generateRefreshToken(user);

        return res.json({
            message: 'Login successful',
            token,
            refreshToken,
            user: buildAuthUser(user)
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Error occurred while logging in',
            error: error.message
        });
    }
};

const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ message: 'Refresh token is required' });
        }

        const decoded = jwt.verify(refreshToken, getRefreshSecret());

        if (decoded.type !== 'refresh') {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }

        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        return res.json({
            message: 'Token refreshed successfully',
            token: generateToken(user),
            refreshToken: generateRefreshToken(user),
            user: buildAuthUser(user)
        });
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }
};

const profile = async (req, res) => {
    return res.json({
        user: req.user
    });
};

module.exports = {
    register,
    login,
    refresh,
    profile
};
