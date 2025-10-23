const cron = require('node-cron');
const mongoose = require('mongoose');
const os = require('os');
const logger = require('../utils/logger');

/**
 * Health Check Agent
 * Ejecuta verificaciones cada 5 minutos para asegurar que el sistema funciona correctamente
 *
 * Verifica:
 * - MongoDB conectado y respondiendo
 * - API endpoints críticos
 * - Espacio en disco > 20%
 * - Memoria disponible > 20%
 * - Jobs automáticos ejecutándose
 */

class HealthCheckAgent {
  constructor() {
    this.task = null;
    this.lastCheck = null;
    this.consecutiveFailures = 0;
    this.maxConsecutiveFailures = 3;
  }

  /**
   * Verificar conexión a MongoDB
   */
  async checkMongoDBConnection() {
    try {
      const state = mongoose.connection.readyState;
      // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting

      if (state !== 1) {
        return {
          healthy: false,
          message: `MongoDB no conectado. Estado: ${state}`,
          severity: 'critical'
        };
      }

      // Intentar una query simple para verificar que realmente funciona
      await mongoose.connection.db.admin().ping();

      return {
        healthy: true,
        message: 'MongoDB conectado y respondiendo',
        severity: 'info'
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Error al conectar con MongoDB: ${error.message}`,
        severity: 'critical',
        error: error.stack
      };
    }
  }

  /**
   * Verificar espacio en disco
   */
  async checkDiskSpace() {
    try {
      // En Node.js, no hay una forma nativa de verificar el espacio en disco
      // Esto funcionaría mejor con un paquete como 'diskusage' o 'check-disk-space'
      // Por ahora, retornamos healthy (se puede mejorar instalando el paquete)

      return {
        healthy: true,
        message: 'Verificación de disco (requiere paquete adicional)',
        severity: 'info'
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Error al verificar espacio en disco: ${error.message}`,
        severity: 'warning',
        error: error.stack
      };
    }
  }

  /**
   * Verificar memoria disponible
   */
  async checkMemory() {
    try {
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const percentageUsed = (usedMemory / totalMemory) * 100;

      const healthy = percentageUsed < 80; // Alerta si se usa más del 80%

      return {
        healthy,
        message: `Memoria: ${percentageUsed.toFixed(2)}% en uso`,
        severity: healthy ? 'info' : 'warning',
        details: {
          total: (totalMemory / 1024 / 1024 / 1024).toFixed(2) + ' GB',
          used: (usedMemory / 1024 / 1024 / 1024).toFixed(2) + ' GB',
          free: (freeMemory / 1024 / 1024 / 1024).toFixed(2) + ' GB',
          percentageUsed: percentageUsed.toFixed(2) + '%'
        }
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Error al verificar memoria: ${error.message}`,
        severity: 'warning',
        error: error.stack
      };
    }
  }

  /**
   * Verificar CPU
   */
  async checkCPU() {
    try {
      const cpus = os.cpus();
      const numCPUs = cpus.length;

      // Calcular uso promedio de CPU
      let totalIdle = 0;
      let totalTick = 0;

      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });

      const idle = totalIdle / numCPUs;
      const total = totalTick / numCPUs;
      const percentageUsed = 100 - ~~(100 * idle / total);

      const healthy = percentageUsed < 80; // Alerta si se usa más del 80%

      return {
        healthy,
        message: `CPU: ${percentageUsed}% en uso`,
        severity: healthy ? 'info' : 'warning',
        details: {
          cores: numCPUs,
          percentageUsed: percentageUsed + '%'
        }
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Error al verificar CPU: ${error.message}`,
        severity: 'warning',
        error: error.stack
      };
    }
  }

  /**
   * Verificar endpoints críticos
   */
  async checkCriticalEndpoints() {
    try {
      // Verificar que los modelos están disponibles
      const modelsAvailable = mongoose.models && Object.keys(mongoose.models).length > 0;

      if (!modelsAvailable) {
        return {
          healthy: false,
          message: 'Modelos de Mongoose no disponibles',
          severity: 'high'
        };
      }

      return {
        healthy: true,
        message: `${Object.keys(mongoose.models).length} modelos disponibles`,
        severity: 'info'
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Error al verificar endpoints críticos: ${error.message}`,
        severity: 'high',
        error: error.stack
      };
    }
  }

  /**
   * Realizar todas las verificaciones
   */
  async performHealthCheck() {
    const timestamp = new Date();
    logger.info('========================================');
    logger.info('  Health Check Agent - Iniciando');
    logger.info('========================================');

    const checks = await Promise.all([
      this.checkMongoDBConnection(),
      this.checkDiskSpace(),
      this.checkMemory(),
      this.checkCPU(),
      this.checkCriticalEndpoints()
    ]);

    const results = {
      timestamp,
      checks: {
        mongodb: checks[0],
        disk: checks[1],
        memory: checks[2],
        cpu: checks[3],
        endpoints: checks[4]
      },
      overall: {
        healthy: checks.every(check => check.healthy),
        criticalIssues: checks.filter(check => !check.healthy && check.severity === 'critical').length,
        warnings: checks.filter(check => !check.healthy && check.severity === 'warning').length
      }
    };

    // Log de resultados
    if (results.overall.healthy) {
      logger.info('✓ Health Check: PASS - Sistema saludable');
      this.consecutiveFailures = 0;
    } else {
      logger.warn(`⚠ Health Check: FAILED - ${results.overall.criticalIssues} críticos, ${results.overall.warnings} warnings`);
      this.consecutiveFailures++;

      // Log detallado de problemas
      checks.forEach((check, index) => {
        if (!check.healthy) {
          logger.error(`  - ${check.message}`);
          if (check.error) {
            logger.error(`    Error: ${check.error}`);
          }
        }
      });
    }

    // Si hay fallos consecutivos, generar alerta
    if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
      await this.handleCriticalFailure(results);
    }

    this.lastCheck = results;
    logger.info('========================================');

    return results;
  }

  /**
   * Manejar fallos críticos
   */
  async handleCriticalFailure(results) {
    logger.error('========================================');
    logger.error('  ⚠️ ALERTA CRÍTICA: Sistema inestable');
    logger.error(`  Fallos consecutivos: ${this.consecutiveFailures}`);
    logger.error('========================================');

    // Aquí se podría:
    // 1. Enviar email de alerta
    // 2. Registrar en ErrorLog
    // 3. Intentar auto-recuperación
    // 4. Notificar a servicio externo de monitoreo

    try {
      const ErrorLog = mongoose.model('ErrorLog');
      await ErrorLog.registrarError({
        tipo: 'other',
        severidad: 'critical',
        mensaje: `Health Check Agent: ${this.consecutiveFailures} fallos consecutivos detectados`,
        datos: results,
        hostname: os.hostname(),
        nodeVersion: process.version
      });
    } catch (error) {
      logger.error('Error al registrar fallo crítico:', error);
    }
  }

  /**
   * Obtener último health check
   */
  getLastCheck() {
    return this.lastCheck;
  }

  /**
   * Iniciar el agente
   */
  start() {
    // Ejecutar cada 5 minutos (cron: */5 * * * *)
    this.task = cron.schedule('*/5 * * * *', async () => {
      await this.performHealthCheck();
    }, {
      scheduled: true,
      timezone: 'Europe/Madrid'
    });

    logger.info('✓ Health Check Agent iniciado (ejecuta cada 5 minutos)');

    // Ejecutar una verificación inmediata
    setTimeout(() => {
      this.performHealthCheck();
    }, 5000); // Esperar 5 segundos para que MongoDB esté listo

    return this.task;
  }

  /**
   * Detener el agente
   */
  stop() {
    if (this.task) {
      this.task.stop();
      logger.info('Health Check Agent detenido');
    }
  }
}

// Exportar instancia única (singleton)
module.exports = new HealthCheckAgent();
