const { Pool } = require('pg');
require('dotenv').config();

// Pool de connexions PostgreSQL — réutilisé dans toute l'app
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'medical_app',
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('Erreur inattendue sur le pool PostgreSQL', err);
  process.exit(-1);
});

// Wrapper simple pour exécuter des requêtes avec logging
const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };
