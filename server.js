 const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const port = process.env.PORT || 3000; // Use PORT do Elastic Beanstalk
const secretKey = 'your-very-secure-secret-key'; // Substitua por uma chave segura

// Middleware
app.use(helmet());
app.use(morgan('dev')); 
app.use(express.json());

// MySQL connection (RDS)
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false
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
    timestamps: false
});

// Product model
const Product = sequelize.define('Product', {
    uid: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    sku_code: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    sector: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    promotional_price: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    brand: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    supplier_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    status: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    barcode: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    cost: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    unit_of_measure: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    created_at: {
        type: DataTypes.STRING(19),
        allowNull: false
    }
}, {
    tableName: 'products',
    timestamps: false
});

// Sync models with database
sequelize.sync({ force: false }).then(() => {
    console.log('Tables synchronized');
});

// Authentication middleware
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

// Route: List restaurants
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

// Route: Register product
app.post('/products', authenticateMiddleware, async (req, res) => {
    const { name, sku_code, sector, price, promotional_price, quantity, brand, supplier_id, status, barcode, cost, unit_of_measure } = req.body;

    if (!name || !sku_code || !sector || !price || !quantity || !brand || status === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const product = await Product.create({
            name,
            sku_code,
            sector,
            price,
            promotional_price,
            quantity,
            brand,
            supplier_id,
            status,
            barcode,
            cost,
            unit_of_measure,
            created_at
        });
        res.status(201).json({ message: 'Product registered successfully', product });
    } catch (err) {
        res.status(500).json({ error: 'Error registering product' });
    }
});

// Route: List products
app.get('/products', authenticateMiddleware, async (req, res) => {
    try {
        const products = await Product.findAll({
            attributes: ['uid', 'name', 'sku_code', 'sector', 'price', 'promotional_price', 'quantity', 'brand', 'supplier_id', 'status', 'barcode', 'cost', 'unit_of_measure', 'created_at']
        });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'Error listing products' });
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

// Route: Payment status webhook
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