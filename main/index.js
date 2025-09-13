require('dotenv').config()


const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const port = 3000;
const secretKey = 'your-very-secure-secret-key'; // Replace with a secure key (use .env in production)

// Middleware
app.use(helmet()); // Basic security
app.use(morgan('dev')); // Request logging
app.use(express.json()); // JSON parsing

// MySQL connection
const sequelize = new Sequelize('restaurants_db', 'root', '1234', {
    host: 'localhost',
    dialect: 'mysql',
    logging: false // Disable SQL logs (optional)
});

// Test connection
sequelize.authenticate()
    .then(() => console.log('Connected to MySQL'))
    .catch(err => console.error('Error connecting to MySQL:', err));

// Restaurant model
const Restaurant = sequelize.define('Restaurant', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    online: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    paid: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'Restaurants',
    timestamps: false // Disable createdAt/updatedAt (optional)
});

// Sync model with database (creates table if it doesn't exist)
sequelize.sync({ force: false }).then(() => {
    console.log('Restaurants table synchronized');
});

// Authentication middleware
const authenticateMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer token
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

// Route: Register restaurant
app.post('/register', async (req, res) => {
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

// Route: Restaurant login
app.post('/login', async (req, res) => {
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

// Route: List restaurants (online/offline, paid/unpaid)
app.get('/restaurants', authenticateMiddleware, async (req, res) => {
    try {
        const restaurants = await Restaurant.findAll({
            attributes: ['id', 'name', 'email', 'online', 'paid']
        });
        res.json(restaurants);
    } catch (err) {
        res.status(500).json({ error: 'Error listing restaurants' });
    }
});

// Route: Update online/offline status
app.put('/restaurants/online', authenticateMiddleware, async (req, res) => {
    const { online } = req.body;
    
    try {
        req.restaurant.online = online;
        await req.restaurant.save();
        res.json({ message: `Restaurant ${req.restaurant.name} is now ${online ? 'online' : 'offline'}` });
    } catch (err) {
        res.status(500).json({ error: 'Error updating status' });
    }
});

// Route: Generate label data
app.post('/labels/generate', authenticateMiddleware, async (req, res) => {
    const { orderId, customer, items, address } = req.body;
    
    if (!orderId || !customer || !items) {
        return res.status(400).json({ error: 'Incomplete order data' });
    }
    
    try {
        const label = {
            orderId,
            customer,
            items,
            address: address || 'Not provided',
            restaurant: req.restaurant.name,
            date: new Date().toISOString()
        };
        res.json({ label });
    } catch (err) {
        res.status(500).json({ error: 'Error generating label' });
    }
});

// Route: Payment status webhook (e.g., Stripe)
app.post('/payments/webhook', async (req, res) => {
    const { paymentId, status, restaurantId } = req.body;
    
    try {
        const restaurant = await Restaurant.findByPk(restaurantId);
        if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
        
        restaurant.paid = (status === 'paid');
        await restaurant.save();
        res.json({ message: 'Payment status updated' });
    } catch (err) {
        res.status(500).json({ error: 'Error processing webhook' });
    }
});

// Route: Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Servidor rodando e banco conectado' });
});


// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});