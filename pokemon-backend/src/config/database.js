const { Sequelize } = require('sequelize');
require('dotenv').config();

const DB_DIALECT = process.env.DB_DIALECT || 'sqlite';

let sequelize;

if (DB_DIALECT === 'postgres') {
  // Conexión a PostgreSQL usando las variables definidas en .env
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5433,
      dialect: 'postgres',
      logging: false
    }
  );
} else {
  // Por defecto usa SQLite:
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || './database.sqlite',
    logging: false
  });
}

module.exports = sequelize;
