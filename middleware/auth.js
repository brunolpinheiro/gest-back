// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const Restaurant = require('../models/restaurant');

const secretKey = process.env.SECRET_KEY || 'your-very-secure-secret-key'; // Use .env

const authenticateMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token not provided' });

    try {
        const decoded = jwt.verify(token, secretKey);
        const restaurant = await Restaurant.findByPk(decoded.id);
        if (!restaurant) return res.status(401).json({ error: 'Restaurant not found' });
        req.restaurant = restaurant;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = authenticateMiddleware;