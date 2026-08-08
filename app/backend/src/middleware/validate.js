const { body, param, validationResult } = require('express-validator');

// Renvoie 400 avec le détail des erreurs si la validation échoue
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

module.exports = { handleValidation, patientRules, idParamRule };
