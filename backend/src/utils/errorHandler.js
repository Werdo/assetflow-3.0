const logger = require('./logger');

/**
 * Clase de error personalizada para errores de la aplicación
 */
class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Clase de error de validación
 */
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Clase de error de autenticación
 */
class AuthenticationError extends AppError {
  constructor(message = 'No autorizado') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Clase de error de autorización
 */
class AuthorizationError extends AppError {
  constructor(message = 'Acceso denegado') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Clase de error de recurso no encontrado
 */
class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super(`${resource} no encontrado`, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Maneja errores de Mongoose
 * @param {Error} error - Error de Mongoose
 * @returns {AppError} Error formateado
 */
const handleMongooseError = (error) => {
  // Error de validación de Mongoose
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message
    }));

    return new ValidationError('Error de validación', errors);
  }

  // Error de clave duplicada
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    const value = error.keyValue[field];

    return new ValidationError(`El valor '${value}' ya existe para el campo '${field}'`);
  }

  // Error de cast (ID inválido, etc)
  if (error.name === 'CastError') {
    return new ValidationError(`Valor inválido para ${error.path}: ${error.value}`);
  }

  return new AppError('Error de base de datos', 500);
};

/**
 * Maneja errores de JWT
 * @param {Error} error - Error de JWT
 * @returns {AppError} Error formateado
 */
const handleJWTError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return new AuthenticationError('Token inválido');
  }

  if (error.name === 'TokenExpiredError') {
    return new AuthenticationError('Token expirado');
  }

  return new AuthenticationError('Error de autenticación');
};

/**
 * Formatea la respuesta de error
 * @param {Error} error - Error a formatear
 * @param {Object} req - Request de Express
 * @returns {Object} Respuesta formateada
 */
const formatErrorResponse = (error, req) => {
  const response = {
    success: false,
    message: error.message || 'Error interno del servidor',
    error: {
      statusCode: error.statusCode || 500
    }
  };

  // Agregar detalles en desarrollo
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = error.stack;

    if (error.details) {
      response.error.details = error.details;
    }
  }

  // Agregar detalles de validación
  if (error instanceof ValidationError && error.details) {
    response.error.validationErrors = error.details;
  }

  return response;
};

/**
 * Middleware de manejo de errores para Express
 */
const errorMiddleware = (err, req, res, next) => {
  let error = err;

  // Log del error
  logger.error('Error en la aplicación', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user ? req.user.id : null
  });

  // Convertir errores conocidos a AppError
  if (err.name === 'ValidationError' || err.name === 'CastError' || err.code === 11000) {
    error = handleMongooseError(err);
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = handleJWTError(err);
  } else if (!(err instanceof AppError)) {
    error = new AppError(err.message || 'Error interno del servidor', err.statusCode || 500);
  }

  const response = formatErrorResponse(error, req);

  res.status(error.statusCode || 500).json(response);
};

/**
 * Middleware para rutas no encontradas
 */
const notFoundMiddleware = (req, res, next) => {
  const error = new NotFoundError('Ruta');
  next(error);
};

/**
 * Wrapper asíncrono para controladores
 * Captura errores de funciones async/await automáticamente
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Maneja errores no capturados
 */
const handleUncaughtException = () => {
  process.on('uncaughtException', (error) => {
    logger.error('UNCAUGHT EXCEPTION - Apagando servidor', error);
    process.exit(1);
  });
};

/**
 * Maneja promesas rechazadas no capturadas
 */
const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (error) => {
    logger.error('UNHANDLED REJECTION - Apagando servidor', error);
    process.exit(1);
  });
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  errorMiddleware,
  notFoundMiddleware,
  asyncHandler,
  handleUncaughtException,
  handleUnhandledRejection
};
