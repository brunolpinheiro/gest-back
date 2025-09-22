// src/routes/payments.js
const express = require('express');
const Restaurant = require('../models/restaurants');

const router = express();

router.post('/webhook', async (req, res) => {
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

module.exports = router;