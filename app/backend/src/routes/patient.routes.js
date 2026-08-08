const express = require('express');
const router = express.Router();

const controller = require('../controllers/patient.controller');
const { authenticate } = require('../middleware/auth');
const { patientRules, idParamRule, handleValidation } = require('../middleware/validate');

// Toutes les routes patients nécessitent une authentification
router.use(authenticate);

router.get('/', controller.getAllPatients);
router.get('/:id', idParamRule, handleValidation, controller.getPatientById);
router.post('/', patientRules, handleValidation, controller.createPatient);
router.put('/:id', idParamRule, patientRules, handleValidation, controller.updatePatient);
router.delete('/:id', idParamRule, handleValidation, controller.deletePatient);

module.exports = router;
