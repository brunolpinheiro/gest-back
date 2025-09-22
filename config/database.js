// src/config/database.js
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false
});

sequelize.authenticate()
    .then(() => console.log('Connected to MySQL'))
    .catch(err => console.error('Error connecting to MySQL:', err));

module.exports = { sequelize, DataTypes };