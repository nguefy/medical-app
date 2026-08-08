const { body, param, validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

const patientRules = [
  body('firstName').trim().notEmpty().withMessage('Prénom requis'),
  body('lastName').trim().notEmpty().withMessage('Nom requis'),
  body('dateOfBirth').isISO8601().withMessage('Date de naissance invalide (format YYYY-MM-DD)'),
  body('email').optional({ nullable: true }).isEmail().withMessage('Email invalide'),
  body('phone').optional({ nullable: true }).trim(),
  body('bloodType').optional({ nullable: true }).isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
];

const idParamRule = [param('id').isUUID().withMessage('Identifiant patient invalide')];

const registerRules = [
  body('username').trim().isLength({ min: 3 }).withMessage('Nom d\'utilisateur trop court (min 3 caractères)'),
  body('password').isLength({ min: 8 }).withMessage('Mot de passe trop court (min 8 caractères)'),
  body('role').optional().isIn(['staff', 'admin']).withMessage('Rôle invalide'),
];

const loginRules = [
  body('username').trim().notEmpty().withMessage('Nom d\'utilisateur requis'),
  body('password').notEmpty().withMessage('Mot de passe requis'),
];

module.exports = { handleValidation, patientRules, idParamRule, registerRules, loginRules };
