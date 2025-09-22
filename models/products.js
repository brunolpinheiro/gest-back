// src/models/Product.js
const { sequelize, DataTypes } = require('../config/database');

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

module.exports = Product;