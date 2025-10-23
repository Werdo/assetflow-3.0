const fs = require('fs');
const path = require('path');

/**
 * Logger simple para el sistema AssetFlow
 */

// Niveles de log
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

// Colores para consola
const COLORS = {
  ERROR: '\x1b[31m', // Rojo
  WARN: '\x1b[33m',  // Amarillo
  INFO: '\x1b[36m',  // Cyan
  DEBUG: '\x1b[90m', // Gris
  RESET: '\x1b[0m'
};

// Nivel de log actual (desde env o por defecto INFO)
const currentLevel = process.env.LOG_LEVEL ? process.env.LOG_LEVEL.toUpperCase() : 'INFO';

// Obtener ruta de logs
const getLogPath = () => {
  const logPath = process.env.LOG_PATH || './logs';

  // Crear directorio si no existe
  if (!fs.existsSync(logPath)) {
    fs.mkdirSync(logPath, { recursive: true });
  }

  return logPath;
};

/**
 * Formatea una fecha para el log
 * @returns {string} Fecha formateada
 */
const formatDate = () => {
  const now = new Date();
  return now.toISOString();
};

/**
 * Escribe un mensaje en el archivo de log
 * @param {string} level - Nivel del log
 * @param {string} message - Mensaje
 * @param {Object} meta - Metadatos adicionales
 */
const writeToFile = (level, message, meta = {}) => {
  try {
    const logPath = getLogPath();
    const date = new Date();
    const fileName = `assetflow-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.log`;
    const filePath = path.join(logPath, fileName);

    const logEntry = {
      timestamp: formatDate(),
      level,
      message,
      ...meta
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    fs.appendFileSync(filePath, logLine, 'utf8');
  } catch (error) {
    console.error('Error escribiendo en archivo de log:', error.message);
  }
};

/**
 * Escribe un mensaje en la consola
 * @param {string} level - Nivel del log
 * @param {string} message - Mensaje
 * @param {Object} meta - Metadatos adicionales
 */
const writeToConsole = (level, message, meta = {}) => {
  const color = COLORS[level] || COLORS.RESET;
  const timestamp = formatDate();

  let output = `${color}[${timestamp}] [${level}]${COLORS.RESET} ${message}`;

  if (Object.keys(meta).length > 0) {
    output += ` ${JSON.stringify(meta)}`;
  }

  console.log(output);
};

/**
 * Verifica si un nivel de log debe ser mostrado
 * @param {string} level - Nivel a verificar
 * @returns {boolean} True si debe mostrarse
 */
const shouldLog = (level) => {
  const levels = Object.keys(LOG_LEVELS);
  const currentIndex = levels.indexOf(currentLevel);
  const levelIndex = levels.indexOf(level);

  return levelIndex <= currentIndex;
};

/**
 * Log genérico
 * @param {string} level - Nivel del log
 * @param {string} message - Mensaje
 * @param {Object} meta - Metadatos adicionales
 */
const log = (level, message, meta = {}) => {
  if (!shouldLog(level)) {
    return;
  }

  writeToConsole(level, message, meta);

  // Solo escribir a archivo en producción o si está configurado
  if (process.env.NODE_ENV === 'production' || process.env.LOG_TO_FILE === 'true') {
    writeToFile(level, message, meta);
  }
};

/**
 * Log de error
 * @param {string} message - Mensaje de error
 * @param {Error|Object} error - Error o metadatos
 */
const error = (message, error = {}) => {
  const meta = error instanceof Error
    ? { error: error.message, stack: error.stack }
    : error;

  log(LOG_LEVELS.ERROR, message, meta);
};

/**
 * Log de warning
 * @param {string} message - Mensaje de advertencia
 * @param {Object} meta - Metadatos adicionales
 */
const warn = (message, meta = {}) => {
  log(LOG_LEVELS.WARN, message, meta);
};

/**
 * Log de información
 * @param {string} message - Mensaje informativo
 * @param {Object} meta - Metadatos adicionales
 */
const info = (message, meta = {}) => {
  log(LOG_LEVELS.INFO, message, meta);
};

/**
 * Log de debug
 * @param {string} message - Mensaje de debug
 * @param {Object} meta - Metadatos adicionales
 */
const debug = (message, meta = {}) => {
  log(LOG_LEVELS.DEBUG, message, meta);
};

/**
 * Log de petición HTTP
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @param {number} duration - Duración en ms
 */
const http = (req, res, duration) => {
  const meta = {
    method: req.method,
    url: req.originalUrl || req.url,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip,
    userAgent: req.get('user-agent')
  };

  if (req.user) {
    meta.userId = req.user.id;
  }

  const level = res.statusCode >= 500 ? LOG_LEVELS.ERROR :
                res.statusCode >= 400 ? LOG_LEVELS.WARN :
                LOG_LEVELS.INFO;

  log(level, `HTTP ${req.method} ${req.originalUrl || req.url}`, meta);
};

/**
 * Limpia archivos de log antiguos
 * @param {number} daysToKeep - Días a mantener (por defecto 30)
 */
const cleanOldLogs = (daysToKeep = 30) => {
  try {
    const logPath = getLogPath();
    const files = fs.readdirSync(logPath);

    const now = Date.now();
    const maxAge = daysToKeep * 24 * 60 * 60 * 1000;

    files.forEach(file => {
      const filePath = path.join(logPath, file);
      const stats = fs.statSync(filePath);

      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        info(`Log antiguo eliminado: ${file}`);
      }
    });
  } catch (error) {
    warn('Error limpiando logs antiguos', { error: error.message });
  }
};

module.exports = {
  error,
  warn,
  info,
  debug,
  http,
  cleanOldLogs,
  LOG_LEVELS
};
