const crypto = require('crypto');

/**
 * Utilidades de encriptación para API keys y datos sensibles
 */

const ALGORITHM = 'aes-256-cbc';

// Obtener clave de encriptación desde variables de entorno
const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY no está configurada en variables de entorno');
  }

  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY debe tener 64 caracteres hexadecimales (256 bits)');
  }

  return Buffer.from(key, 'hex');
};

/**
 * Encripta un texto usando AES-256-CBC
 * @param {string} text - Texto a encriptar
 * @returns {string} Texto encriptado en formato: iv:encrypted
 */
const encrypt = (text) => {
  try {
    const encryptionKey = getEncryptionKey();
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Retornar IV + datos encriptados separados por ':'
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    throw new Error(`Error al encriptar: ${error.message}`);
  }
};

/**
 * Desencripta un texto usando AES-256-CBC
 * @param {string} encryptedData - Texto encriptado en formato: iv:encrypted
 * @returns {string} Texto desencriptado
 */
const decrypt = (encryptedData) => {
  try {
    const encryptionKey = getEncryptionKey();

    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      throw new Error('Formato de datos encriptados inválido');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(`Error al desencriptar: ${error.message}`);
  }
};

/**
 * Genera un hash SHA-256 de un texto
 * @param {string} text - Texto a hashear
 * @returns {string} Hash en formato hexadecimal
 */
const hash = (text) => {
  return crypto.createHash('sha256').update(text).digest('hex');
};

/**
 * Genera una clave aleatoria para encriptación
 * @param {number} length - Longitud en bytes (por defecto 32 para AES-256)
 * @returns {string} Clave en formato hexadecimal
 */
const generateKey = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Genera un token aleatorio seguro
 * @param {number} length - Longitud en bytes (por defecto 32)
 * @returns {string} Token en formato hexadecimal
 */
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

module.exports = {
  encrypt,
  decrypt,
  hash,
  generateKey,
  generateToken
};
