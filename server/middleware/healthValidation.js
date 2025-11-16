const { body } = require('express-validator');
const { handleValidationErrors } = require('./validation');

const vaccinationValidation = [
  body('animal_id').isInt({ min: 1 }),
  body('vacuna_id').isInt({ min: 1 }),
  body('fecha_aplicacion').isISO8601(),
  body('dosis').isFloat({ min: 0.1, max: 100 }),
  body('lote_vacuna').trim().isLength({ min: 1, max: 50 }),
  body('veterinario').optional().trim().isLength({ max: 100 }),
  handleValidationErrors
];

const treatmentValidation = [
  body('animal_id').isInt({ min: 1 }),
  body('medicamento').trim().isLength({ min: 1, max: 100 }),
  body('dosis').isFloat({ min: 0.1, max: 1000 }),
  body('via_administracion').isIn(['oral', 'intramuscular', 'subcutanea', 'intravenosa', 'topica']),
  body('fecha_inicio').isISO8601(),
  body('duracion_dias').isInt({ min: 1, max: 365 }),
  body('motivo').trim().isLength({ min: 1, max: 500 }),
  handleValidationErrors
];

const healthEventValidation = [
  body('animal_id').isInt({ min: 1 }),
  body('tipo_evento').isIn(['enfermedad', 'lesion', 'muerte', 'recuperacion', 'observacion']),
  body('fecha_evento').isISO8601(),
  body('descripcion').trim().isLength({ min: 1, max: 1000 }),
  body('gravedad').optional().isIn(['leve', 'moderada', 'grave', 'critica']),
  handleValidationErrors
];

module.exports = {
  vaccinationValidation,
  treatmentValidation,
  healthEventValidation
};