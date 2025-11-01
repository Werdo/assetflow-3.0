const { validationResult, body, param, query } = require('express-validator');
const { ValidationError } = require('../utils/errorHandler');

/**
 * Middleware para manejar resultados de validación
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));

    throw new ValidationError('Errores de validación', formattedErrors);
  }

  next();
};

/**
 * Validaciones para autenticación
 */
const validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),

  body('email')
    .trim()
    .notEmpty().withMessage('El email es requerido')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('La contraseña es requerida')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),

  body('role')
    .optional()
    .isIn(['admin', 'manager', 'user']).withMessage('Rol inválido'),

  handleValidationErrors
];

const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('El email es requerido')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('La contraseña es requerida'),

  handleValidationErrors
];

/**
 * Validaciones para productos
 */
const validateProducto = [
  body('codigo')
    .trim()
    .notEmpty().withMessage('El código es requerido')
    .toUpperCase(),

  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 200 }).withMessage('El nombre debe tener entre 2 y 200 caracteres'),

  body('precioUnitario')
    .notEmpty().withMessage('El precio unitario es requerido')
    .isFloat({ min: 0 }).withMessage('El precio debe ser mayor o igual a 0'),

  body('unidadMedida')
    .optional()
    .trim(),

  body('stockEnNuestroAlmacen')
    .optional()
    .isInt({ min: 0 }).withMessage('El stock debe ser un número entero mayor o igual a 0'),

  handleValidationErrors
];

/**
 * Validaciones para clientes
 */
const validateCliente = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 200 }).withMessage('El nombre debe tener entre 2 y 200 caracteres'),

  body('cif')
    .trim()
    .notEmpty().withMessage('El CIF es requerido')
    .toUpperCase(),

  // Accept both flat structure (email field) and nested structure (contacto.email)
  body('email')
    .optional()
    .isEmail().withMessage('Email de contacto inválido')
    .normalizeEmail(),

  body('contacto.email')
    .optional()
    .isEmail().withMessage('Email de contacto inválido')
    .normalizeEmail(),

  handleValidationErrors
];

/**
 * Validaciones para emplazamientos
 */
const validateEmplazamiento = [
  body('cliente')
    .notEmpty().withMessage('El cliente es requerido')
    .isMongoId().withMessage('ID de cliente inválido'),

  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 200 }).withMessage('El nombre debe tener entre 2 y 200 caracteres'),

  body('coordenadas.coordinates')
    .notEmpty().withMessage('Las coordenadas son requeridas')
    .isArray({ min: 2, max: 2 }).withMessage('Las coordenadas deben tener longitud y latitud')
    .custom((value) => {
      const [lng, lat] = value;
      if (lng < -180 || lng > 180) {
        throw new Error('Longitud inválida (debe estar entre -180 y 180)');
      }
      if (lat < -90 || lat > 90) {
        throw new Error('Latitud inválida (debe estar entre -90 y 90)');
      }
      return true;
    }),

  body('contacto.email')
    .optional()
    .isEmail().withMessage('Email de contacto inválido')
    .normalizeEmail(),

  handleValidationErrors
];

/**
 * Validaciones para depósitos
 */
const validateDeposito = [
  body('producto')
    .notEmpty().withMessage('El producto es requerido')
    .isMongoId().withMessage('ID de producto inválido'),

  body('emplazamiento')
    .notEmpty().withMessage('El emplazamiento es requerido')
    .isMongoId().withMessage('ID de emplazamiento inválido'),

  body('cantidad')
    .notEmpty().withMessage('La cantidad es requerida')
    .isFloat({ min: 0 }).withMessage('La cantidad debe ser mayor o igual a 0'),

  body('fechaDeposito')
    .optional()
    .isISO8601().withMessage('Fecha de depósito inválida'),

  body('fechaVencimiento')
    .optional()
    .isISO8601().withMessage('Fecha de vencimiento inválida'),

  handleValidationErrors
];

/**
 * Validaciones para MongoDB IDs
 */
const validateMongoId = (paramName = 'id') => [
  param(paramName)
    .isMongoId().withMessage('ID inválido'),

  handleValidationErrors
];

/**
 * Validaciones para paginación
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('La página debe ser un número mayor a 0'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('El límite debe estar entre 1 y 100'),

  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validateProducto,
  validateCliente,
  validateEmplazamiento,
  validateDeposito,
  validateMongoId,
  validatePagination
};
