const express = require('express');
const router = express.Router();

const controller = require('../controllers/auth.controller');
const { registerRules, loginRules, handleValidation } = require('../middleware/validate');

router.post('/register', registerRules, handleValidation, controller.register);
router.post('/login', loginRules, handleValidation, controller.login);

module.exports = router;
