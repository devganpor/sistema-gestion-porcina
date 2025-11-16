const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Datos de entrada inválidos',
      details: errors.array()
    });
  }
  next();
};

const animalValidation = [
  body('identificador_unico')
    .trim()
    .isLength({ min: 1, max: 50 })
    .matches(/^[A-Za-z0-9-_]+$/)
    .withMessage('Identificador debe ser alfanumérico'),
  body('sexo').isIn(['macho', 'hembra']),
  body('categoria').isIn(['lechon', 'recria', 'desarrollo', 'engorde', 'reproductor']),
  body('peso_nacimiento').optional().isFloat({ min: 0, max: 10 }),
  body('fecha_nacimiento').optional().isISO8601(),
  handleValidationErrors
];

const weightValidation = [
  body('animal_id').isInt({ min: 1 }),
  body('peso').isFloat({ min: 0, max: 1000 }),
  body('fecha_pesaje').isISO8601(),
  handleValidationErrors
];

const locationValidation = [
  body('nombre').trim().isLength({ min: 1, max: 100 }),
  body('tipo').isIn(['corral', 'galpon', 'maternidad', 'destete', 'engorde']),
  body('capacidad_maxima').optional().isInt({ min: 0 }),
  handleValidationErrors
];

module.exports = {
  animalValidation,
  weightValidation,
  locationValidation,
  handleValidationErrors
};