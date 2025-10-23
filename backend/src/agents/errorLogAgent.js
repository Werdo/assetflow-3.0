const os = require('os');
const logger = require('../utils/logger');

/**
 * Error Log Agent
 * Middleware y handlers para capturar todos los errores del sistema en tiempo real
 *
 * Captura:
 * - Errores 500 (Internal Server Error)
 * - Excepciones no capturadas (Uncaught Exceptions)
 * - Promises rechazadas (Unhandled Rejections)
 * - Queries que fallan
 * - Timeouts de requests
 * - Errores de IA APIs
 */

class ErrorLogAgent {
  constructor() {
    this.ErrorLog = null; // Se inicializará cuando Mongoose esté listo
  }

  /**
   * Inicializar el agente con el modelo ErrorLog
   */
  initialize(ErrorLogModel) {
    this.ErrorLog = ErrorLogModel;
    this.setupGlobalErrorHandlers();
    logger.info('✓ Error Log Agent inicializado');
  }

  /**
   * Configurar handlers globales de errores
   */
  setupGlobalErrorHandlers() {
    // Capturar excepciones no capturadas
    process.on('uncaughtException', (error) => {
      logger.error('❌ Uncaught Exception:', error);

      this.logError({
        tipo: 'uncaught_exception',
        severidad: 'critical',
        mensaje: error.message,
        stack: error.stack,
        datos: {
          name: error.name,
          code: error.code
        }
      });

      // NO salir del proceso inmediatamente - intentar recuperación
      // process.exit(1); // Comentado para mantener el proceso activo
    });

    // Capturar promises rechazadas no manejadas
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('❌ Unhandled Rejection:', reason);

      this.logError({
        tipo: 'unhandled_rejection',
        severidad: 'high',
        mensaje: reason?.message || String(reason),
        stack: reason?.stack,
        datos: {
          reason: reason,
          promise: String(promise)
        }
      });
    });

    logger.info('✓ Global error handlers configurados');
  }

  /**
   * Middleware de Express para capturar errores
   */
  expressErrorMiddleware() {
    return async (err, req, res, next) => {
      // Log del error
      logger.error('❌ Express Error:', err);

      // Determinar severidad
      let severidad = 'medium';
      if (err.status >= 500) severidad = 'critical';
      else if (err.status >= 400) severidad = 'medium';

      // Registrar en base de datos
      await this.logError({
        tipo: err.status >= 500 ? 'error_500' : 'other',
        severidad,
        mensaje: err.message || 'Error desconocido',
        stack: err.stack,
        metodo: req.method,
        ruta: req.originalUrl || req.url,
        statusCode: err.status || 500,
        usuario: req.user?._id,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        datos: {
          body: req.body,
          params: req.params,
          query: req.query,
          headers: req.headers
        }
      });

      // Enviar respuesta al cliente
      res.status(err.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Error del servidor' : err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
      });
    };
  }

  /**
   * Registrar error en base de datos
   */
  async logError(errorData) {
    try {
      if (!this.ErrorLog) {
        logger.warn('ErrorLog model no disponible aún');
        return null;
      }

      // Agregar información del sistema
      const errorWithMetadata = {
        ...errorData,
        hostname: os.hostname(),
        nodeVersion: process.version,
        memoria: {
          total: os.totalmem(),
          usado: os.totalmem() - os.freemem(),
          libre: os.freemem()
        },
        fechaError: new Date()
      };

      // Usar el método estático del modelo para evitar duplicados
      const errorLog = await this.ErrorLog.registrarError(errorWithMetadata);

      // Si es crítico, considerar enviar email (implementar después)
      if (errorData.severidad === 'critical') {
        logger.error(`🚨 ERROR CRÍTICO REGISTRADO: ${errorData.mensaje}`);
        // TODO: Enviar email de alerta
      }

      return errorLog;
    } catch (error) {
      // Error al registrar el error - solo hacer log para no causar loop infinito
      logger.error('Error al registrar error en BD:', error);
      return null;
    }
  }

  /**
   * Helper para registrar errores de queries
   */
  async logQueryError(error, query) {
    return await this.logError({
      tipo: 'query_failed',
      severidad: 'high',
      mensaje: `Query falló: ${error.message}`,
      stack: error.stack,
      datos: {
        query: query,
        errorCode: error.code,
        errorName: error.name
      }
    });
  }

  /**
   * Helper para registrar timeout
   */
  async logTimeout(request, tiempoEsperado) {
    return await this.logError({
      tipo: 'timeout',
      severidad: 'medium',
      mensaje: `Request timeout después de ${tiempoEsperado}ms`,
      ruta: request.url,
      metodo: request.method,
      datos: {
        tiempoEsperado,
        url: request.url,
        method: request.method
      }
    });
  }

  /**
   * Helper para registrar errores de IA APIs
   */
  async logIAError(provider, error, contexto) {
    return await this.logError({
      tipo: 'ia_api_error',
      severidad: 'high',
      mensaje: `Error en API de IA (${provider}): ${error.message}`,
      stack: error.stack,
      datos: {
        provider,
        contexto,
        errorCode: error.code,
        errorStatus: error.status
      }
    });
  }

  /**
   * Obtener estadísticas de errores
   */
  async getEstadisticas(desde, hasta) {
    try {
      if (!this.ErrorLog) {
        return null;
      }

      return await this.ErrorLog.getEstadisticas(desde, hasta);
    } catch (error) {
      logger.error('Error al obtener estadísticas:', error);
      return null;
    }
  }

  /**
   * Obtener errores críticos sin resolver
   */
  async getErroresCriticos() {
    try {
      if (!this.ErrorLog) {
        return [];
      }

      return await this.ErrorLog.getErroresCriticos();
    } catch (error) {
      logger.error('Error al obtener errores críticos:', error);
      return [];
    }
  }
}

// Exportar instancia única (singleton)
module.exports = new ErrorLogAgent();
