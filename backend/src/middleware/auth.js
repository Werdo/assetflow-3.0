const User = require('../models/User');
const { verifyToken, extractTokenFromHeader } = require('../utils/jwt');
const { AuthenticationError, AuthorizationError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * Middleware de autenticación
 * Verifica que el usuario esté autenticado mediante JWT
 */
const protect = async (req, res, next) => {
  try {
    // Extraer token del header
    const token = extractTokenFromHeader(req);

    if (!token) {
      throw new AuthenticationError('No se proporcionó token de autenticación');
    }

    // Verificar token
    const decoded = verifyToken(token);

    // Buscar usuario
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      throw new AuthenticationError('Usuario no encontrado');
    }

    if (!user.active) {
      throw new AuthenticationError('Usuario inactivo');
    }

    // Agregar usuario al request
    req.user = user;

    next();
  } catch (error) {
    logger.warn('Error de autenticación', {
      message: error.message,
      url: req.originalUrl,
      ip: req.ip
    });

    next(error);
  }
};

/**
 * Middleware para verificar roles específicos
 * @param  {...string} roles - Roles permitidos
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Usuario no autenticado');
      }

      if (!roles.includes(req.user.role)) {
        logger.warn('Intento de acceso no autorizado', {
          userId: req.user.id,
          userRole: req.user.role,
          requiredRoles: roles,
          url: req.originalUrl
        });

        throw new AuthorizationError('No tiene permisos para realizar esta acción');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware para verificar que el usuario es admin
 */
const isAdmin = authorize('admin');

/**
 * Middleware para verificar que el usuario es admin o manager
 */
const isAdminOrManager = authorize('admin', 'manager');

/**
 * Middleware opcional de autenticación
 * No lanza error si no hay token, solo agrega el usuario si existe
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req);

    if (token) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id).select('-password');

      if (user && user.active) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Ignorar errores de autenticación opcional
    next();
  }
};

/**
 * Middleware para verificar que el usuario accede a sus propios recursos
 * o es admin
 */
const isOwnerOrAdmin = (userIdParam = 'id') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Usuario no autenticado');
      }

      const resourceUserId = req.params[userIdParam];

      if (req.user.role === 'admin') {
        return next();
      }

      if (req.user.id.toString() !== resourceUserId.toString()) {
        throw new AuthorizationError('No puede acceder a recursos de otros usuarios');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  protect,
  authorize,
  isAdmin,
  isAdminOrManager,
  optionalAuth,
  isOwnerOrAdmin
};
