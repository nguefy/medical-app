const { query } = require('../config/db');

// Toutes les fonctions retournent des Promises — appelées depuis le controller

async function findAll() {
  const result = await query(
    `SELECT id, first_name, last_name, date_of_birth, gender, phone, email,
            blood_type, allergies, created_at, updated_at
     FROM patients
     ORDER BY created_at DESC`
  );
  return result.rows;
}

async function findById(id) {
  const result = await query(
    `SELECT id, first_name, last_name, date_of_birth, gender, phone, email,
            blood_type, allergies, created_at, updated_at
     FROM patients WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function create(patient) {
  const { firstName, lastName, dateOfBirth, gender, phone, email, bloodType, allergies } = patient;
  const result = await query(
    `INSERT INTO patients
       (first_name, last_name, date_of_birth, gender, phone, email, blood_type, allergies)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, first_name, last_name, date_of_birth, gender, phone, email,
               blood_type, allergies, created_at, updated_at`,
    [firstName, lastName, dateOfBirth, gender, phone, email, bloodType, allergies]
  );
  return result.rows[0];
}

async function update(id, patient) {
  const { firstName, lastName, dateOfBirth, gender, phone, email, bloodType, allergies } = patient;
  const result = await query(
    `UPDATE patients SET
       first_name = $1, last_name = $2, date_of_birth = $3, gender = $4,
       phone = $5, email = $6, blood_type = $7, allergies = $8, updated_at = now()
     WHERE id = $9
     RETURNING id, first_name, last_name, date_of_birth, gender, phone, email,
               blood_type, allergies, created_at, updated_at`,
    [firstName, lastName, dateOfBirth, gender, phone, email, bloodType, allergies, id]
  );
  return result.rows[0] || null;
}

async function remove(id) {
  const result = await query('DELETE FROM patients WHERE id = $1 RETURNING id', [id]);
  return result.rowCount > 0;
}

module.exports = { findAll, findById, create, update, remove };
