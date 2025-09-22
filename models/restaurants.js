// src/models/Restaurant.js
const { sequelize, DataTypes } = require('../config/database');

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

module.exports = Restaurant;