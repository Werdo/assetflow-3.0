const jwt = require('jsonwebtoken');

/**
 * Utilidades para manejo de JWT (JSON Web Tokens)
 */

/**
 * Genera un token JWT para un usuario
 * @param {Object} user - Objeto del usuario con _id
 * @returns {string} Token JWT firmado
 */
const generateToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role
  };

  const options = {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, options);
};

/**
 * Verifica y decodifica un token JWT
 * @param {string} token - Token JWT a verificar
 * @returns {Object} Payload decodificado del token
 * @throws {Error} Si el token es inválido o ha expirado
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expirado');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Token inválido');
    } else {
      throw new Error('Error al verificar token');
    }
  }
};

/**
 * Decodifica un token JWT sin verificar (útil para debugging)
 * @param {string} token - Token JWT a decodificar
 * @returns {Object} Payload decodificado del token
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Extrae el token del header Authorization
 * @param {Object} req - Objeto request de Express
 * @returns {string|null} Token extraído o null si no existe
 */
const extractTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // Formato: "Bearer TOKEN"
  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

/**
 * Genera un token de refresh (duración más larga)
 * @param {Object} user - Objeto del usuario con _id
 * @returns {string} Token JWT firmado para refresh
 */
const generateRefreshToken = (user) => {
  const payload = {
    id: user._id,
    type: 'refresh'
  };

  const options = {
    expiresIn: '30d'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, options);
};

/**
 * Verifica si un token ha expirado
 * @param {string} token - Token JWT a verificar
 * @returns {boolean} True si ha expirado, false si no
 */
const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

/**
 * Obtiene el tiempo restante antes de que expire el token (en segundos)
 * @param {string} token - Token JWT
 * @returns {number} Segundos restantes, o 0 si ya expiró
 */
const getTokenTimeRemaining = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return 0;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const remaining = decoded.exp - currentTime;

    return remaining > 0 ? remaining : 0;
  } catch (error) {
    return 0;
  }
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
  extractTokenFromHeader,
  generateRefreshToken,
  isTokenExpired,
  getTokenTimeRemaining
};
