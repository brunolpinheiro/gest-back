// src/routes/restaurants.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Restaurant = require('../models/restaurants');
const authenticateMiddleware = require('../middleware/auth');

const router = express.Router();
const secretKey = process.env.SECRET_KEY || 'your-very-secure-secret-key';

router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    try {
        const existingRestaurant = await Restaurant.findOne({ where: { email } });
        if (existingRestaurant) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const passwordHash = bcrypt.hashSync(password, 10);
        const restaurant = await Restaurant.create({ name, email, password: passwordHash });

        res.status(201).json({ message: 'Restaurant registered successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Error registering restaurant' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const restaurant = await Restaurant.findOne({ where: { email } });
        if (!restaurant || !bcrypt.compareSync(password, restaurant.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: restaurant.id }, secretKey, { expiresIn: '1h' });
        res.json({
            token,
            restaurant: { id: restaurant.id, name: restaurant.name, online: restaurant.online }
        });
    } catch (err) {
        res.status(500).json({ error: 'Error logging in' });
    }
});

router.get('/restaurant', authenticateMiddleware, async (req, res) => {
    try {
        const restaurants = await Restaurant.findAll({
            attributes: ['id', 'name', 'email', 'online', 'paid']
        });
        res.json(restaurants);
    } catch (err) {
        res.status(500).json({ error: 'Error listing restaurants' });
    }
});

router.put('/online', authenticateMiddleware, async (req, res) => {
    const { online } = req.body;

    try {
        req.restaurant.online = online;
        await req.restaurant.save();
        res.json({ message: `Restaurant ${req.restaurant.name} is now ${online ? 'online' : 'offline'}` });
    } catch (err) {
        res.status(500).json({ error: 'Error updating status' });
    }
});

module.exports = router;