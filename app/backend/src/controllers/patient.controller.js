const patientModel = require('../models/patient.model');

async function getAllPatients(req, res, next) {
  try {
    const patients = await patientModel.findAll();
    res.json(patients);
  } catch (err) {
    next(err);
  }
}

async function getPatientById(req, res, next) {
  try {
    const patient = await patientModel.findById(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });
    res.json(patient);
  } catch (err) {
    next(err);
  }
}

async function createPatient(req, res, next) {
  try {
    const patient = await patientModel.create(req.body);
    res.status(201).json(patient);
  } catch (err) {
    next(err);
  }
}

async function updatePatient(req, res, next) {
  try {
    const patient = await patientModel.update(req.params.id, req.body);
    if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });
    res.json(patient);
  } catch (err) {
    next(err);
  }
}

async function deletePatient(req, res, next) {
  try {
    const deleted = await patientModel.remove(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Patient non trouvé' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { getAllPatients, getPatientById, createPatient, updatePatient, deletePatient };
