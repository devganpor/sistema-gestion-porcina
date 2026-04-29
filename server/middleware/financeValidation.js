const { body } = require('express-validator');
const { handleValidationErrors } = require('./validation');

const transactionValidation = [
  body('tipo').isIn(['ingreso', 'gasto']),
  body('categoria').trim().isLength({ min: 1, max: 100 }),
  body('subcategoria').optional().trim().isLength({ max: 100 }),
  body('monto').isFloat({ min: 0.01, max: 999999.99 }),
  body('fecha').isISO8601(),
  body('descripcion').trim().isLength({ min: 1, max: 500 }),
  body('metodo_pago').optional().isIn(['efectivo', 'transferencia', 'cheque', 'tarjeta']),
  body('referencia').optional().trim().isLength({ max: 100 }),
  handleValidationErrors
];

const budgetValidation = [
  body('categoria').trim().isLength({ min: 1, max: 100 }),
  body('monto_presupuestado').isFloat({ min: 0.01, max: 999999.99 }),
  body('periodo').isIn(['mensual', 'trimestral', 'semestral', 'anual']),
  body('año').isInt({ min: 2020, max: 2030 }),
  body('mes').optional().isInt({ min: 1, max: 12 }),
  handleValidationErrors
];

module.exports = {
  transactionValidation,
  budgetValidation
};