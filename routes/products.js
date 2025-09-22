// src/routes/products.js
const express = require('express');
const Product = require('../models/Product');
const authenticateMiddleware = require('../middleware/auth');

const router = express();

router.post('/products', authenticateMiddleware, async (req, res) => {
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

router.get('/products', authenticateMiddleware, async (req, res) => {
    try {
        const products = await Product.findAll({
            attributes: ['uid', 'name', 'sku_code', 'sector', 'price', 'promotional_price', 'quantity', 'brand', 'supplier_id', 'status', 'barcode', 'cost', 'unit_of_measure', 'created_at']
        });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'Error listing products' });
    }
});

module.exports = router;