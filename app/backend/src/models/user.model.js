const { query } = require('../config/db');

async function findByUsername(username) {
  const result = await query(
    'SELECT id, username, password_hash, role FROM users WHERE username = $1',
    [username]
  );
  return result.rows[0] || null;
}

async function create({ username, passwordHash, role }) {
  const result = await query(
    `INSERT INTO users (username, password_hash, role)
     VALUES ($1, $2, $3)
     RETURNING id, username, role, created_at`,
    [username, passwordHash, role || 'staff']
  );
  return result.rows[0];
}

module.exports = { findByUsername, create };
