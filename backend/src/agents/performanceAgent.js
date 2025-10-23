const cron = require('node-cron');
const os = require('os');
const logger = require('../utils/logger');

/**
 * Performance Agent
 * Monitorea el rendimiento del sistema cada 10 minutos
 *
 * Monitorea:
 * - Tiempo de respuesta promedio de API
 * - Queries lentas (> 1 segundo)
 * - Uso de CPU y memoria
 * - Número de requests por minuto
 * - Tokens consumidos de IA por hora
 * - Alerta si hay degradación de performance
 */

class PerformanceAgent {
  constructor() {
    this.task = null;
    this.PerformanceMetric = null;
    this.requestMetrics = {
      requests: [],
      startTime: new Date()
    };
    this.queryMetrics = {
      queries: [],
      startTime: new Date()
    };
  }

  /**
   * Inicializar el agente
   */
  initialize(PerformanceMetricModel) {
    this.PerformanceMetric = PerformanceMetricModel;
    logger.info('✓ Performance Agent inicializado');
  }

  /**
   * Middleware para medir tiempo de respuesta de requests
   */
  requestTimingMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();

      // Capturar cuando termina la respuesta
      res.on('finish', () => {
        const duration = Date.now() - startTime;

        this.requestMetrics.requests.push({
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          timestamp: new Date()
        });

        // Log si es muy lento (> 1 segundo)
        if (duration > 1000) {
          logger.warn(`⏱️  Request lento: ${req.method} ${req.path} - ${duration}ms`);
        }
      });

      next();
    };
  }

  /**
   * Registrar métrica de query
   */
  registerQuery(queryType, duration, success = true) {
    this.queryMetrics.queries.push({
      type: queryType,
      duration,
      success,
      timestamp: new Date()
    });

    // Log si es muy lento
    if (duration > 1000) {
      logger.warn(`⏱️  Query lenta: ${queryType} - ${duration}ms`);
    }
  }

  /**
   * Calcular métricas de API response time
   */
  calculateAPIMetrics() {
    const requests = this.requestMetrics.requests;

    if (requests.length === 0) {
      return {
        promedio: 0,
        minimo: 0,
        maximo: 0,
        total: 0
      };
    }

    const duraciones = requests.map(r => r.duration);
    const sum = duraciones.reduce((a, b) => a + b, 0);

    return {
      promedio: sum / duraciones.length,
      minimo: Math.min(...duraciones),
      maximo: Math.max(...duraciones),
      total: requests.length
    };
  }

  /**
   * Calcular métricas de queries
   */
  calculateQueryMetrics() {
    const queries = this.queryMetrics.queries;

    if (queries.length === 0) {
      return {
        queriesLentas: 0,
        promedioTiempo: 0,
        totalQueries: 0
      };
    }

    const queriesLentas = queries.filter(q => q.duration > 1000).length;
    const duraciones = queries.map(q => q.duration);
    const sum = duraciones.reduce((a, b) => a + b, 0);

    return {
      queriesLentas,
      promedioTiempo: sum / duraciones.length,
      totalQueries: queries.length
    };
  }

  /**
   * Obtener métricas de recursos del sistema
   */
  getSystemResourceMetrics() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // CPU usage (aproximado)
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const cpuUsage = 100 - ~~(100 * idle / total);

    return {
      cpu: {
        porcentajeUso: cpuUsage,
        promedioUso: cpuUsage
      },
      memoria: {
        total: totalMemory,
        usado: usedMemory,
        libre: freeMemory,
        porcentajeUso: (usedMemory / totalMemory) * 100
      },
      disco: {
        // Placeholder - requiere paquete adicional para datos reales
        total: 0,
        usado: 0,
        libre: 0,
        porcentajeUso: 0
      }
    };
  }

  /**
   * Calcular métricas de tráfico
   */
  calculateTrafficMetrics() {
    const requests = this.requestMetrics.requests;
    const duracionMinutos = (new Date() - this.requestMetrics.startTime) / 1000 / 60;

    const requestsPorMinuto = duracionMinutos > 0 ? requests.length / duracionMinutos : 0;
    const errores = requests.filter(r => r.statusCode >= 400).length;
    const tasaError = requests.length > 0 ? (errores / requests.length) * 100 : 0;

    return {
      requestsPorMinuto: Math.round(requestsPorMinuto),
      totalRequests: requests.length,
      errores,
      tasaError: tasaError.toFixed(2)
    };
  }

  /**
   * Obtener endpoints más lentos
   */
  getEndpointsLentos() {
    const requests = this.requestMetrics.requests;

    // Agrupar por ruta
    const rutasMap = new Map();

    requests.forEach(req => {
      const key = `${req.method} ${req.path}`;
      if (!rutasMap.has(key)) {
        rutasMap.set(key, {
          ruta: req.path,
          metodo: req.method,
          duraciones: [],
          cantidad: 0
        });
      }

      const ruta = rutasMap.get(key);
      ruta.duraciones.push(req.duration);
      ruta.cantidad++;
    });

    // Calcular promedio y ordenar
    const endpointsLentos = Array.from(rutasMap.values())
      .map(ruta => ({
        ruta: ruta.ruta,
        metodo: ruta.metodo,
        tiempoPromedio: ruta.duraciones.reduce((a, b) => a + b, 0) / ruta.duraciones.length,
        cantidad: ruta.cantidad
      }))
      .sort((a, b) => b.tiempoPromedio - a.tiempoPromedio)
      .slice(0, 10); // Top 10

    return endpointsLentos;
  }

  /**
   * Determinar estado general del sistema
   */
  determinarEstadoGeneral(recursos, trafico, tiempoRespuesta) {
    let estado = 'healthy';

    // Verificar recursos críticos
    if (recursos.memoria.porcentajeUso > 90 || recursos.cpu.porcentajeUso > 90) {
      estado = 'critical';
    } else if (recursos.memoria.porcentajeUso > 80 || recursos.cpu.porcentajeUso > 80) {
      estado = 'warning';
    }

    // Verificar tiempo de respuesta
    if (tiempoRespuesta.promedio > 2000) {
      estado = 'critical';
    } else if (tiempoRespuesta.promedio > 1000) {
      if (estado === 'healthy') estado = 'warning';
    }

    // Verificar tasa de errores
    if (parseFloat(trafico.tasaError) > 10) {
      estado = 'critical';
    } else if (parseFloat(trafico.tasaError) > 5) {
      if (estado === 'healthy') estado = 'warning';
    }

    return estado;
  }

  /**
   * Realizar análisis de performance y guardar métricas
   */
  async performPerformanceAnalysis() {
    try {
      if (!this.PerformanceMetric) {
        logger.warn('PerformanceMetric model no disponible aún');
        return null;
      }

      logger.info('========================================');
      logger.info('  Performance Agent - Analizando');
      logger.info('========================================');

      const periodoInicio = this.requestMetrics.startTime;
      const periodoFin = new Date();

      // Calcular todas las métricas
      const tiempoRespuesta = this.calculateAPIMetrics();
      const queryStats = this.calculateQueryMetrics();
      const recursos = this.getSystemResourceMetrics();
      const trafico = this.calculateTrafficMetrics();
      const endpointsLentos = this.getEndpointsLentos();
      const estadoGeneral = this.determinarEstadoGeneral(recursos, trafico, tiempoRespuesta);

      // Crear registro de performance
      const metrica = new this.PerformanceMetric({
        tipo: 'api_response',
        tiempoRespuesta,
        queryStats,
        recursos,
        trafico,
        endpointsLentos,
        estadoGeneral,
        periodoInicio,
        periodoFin,
        hostname: os.hostname(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
      });

      await metrica.save();

      // Log de resultados
      logger.info(`✓ Performance Analysis Complete:`);
      logger.info(`  - Estado: ${estadoGeneral.toUpperCase()}`);
      logger.info(`  - Tiempo respuesta promedio: ${tiempoRespuesta.promedio.toFixed(2)}ms`);
      logger.info(`  - Requests analizados: ${tiempoRespuesta.total}`);
      logger.info(`  - Queries lentas: ${queryStats.queriesLentas}`);
      logger.info(`  - Uso CPU: ${recursos.cpu.porcentajeUso}%`);
      logger.info(`  - Uso Memoria: ${recursos.memoria.porcentajeUso.toFixed(2)}%`);
      logger.info(`  - Tasa de error: ${trafico.tasaError}%`);

      // Alertas si es necesario
      if (estadoGeneral === 'critical') {
        logger.error(`🚨 ALERTA: Performance CRÍTICA detectada`);
      } else if (estadoGeneral === 'warning') {
        logger.warn(`⚠️  WARNING: Performance degradada`);
      }

      logger.info('========================================');

      // Resetear métricas para el siguiente período
      this.resetMetrics();

      return metrica;
    } catch (error) {
      logger.error('Error en Performance Analysis:', error);
      return null;
    }
  }

  /**
   * Resetear métricas para el siguiente período
   */
  resetMetrics() {
    this.requestMetrics = {
      requests: [],
      startTime: new Date()
    };
    this.queryMetrics = {
      queries: [],
      startTime: new Date()
    };
  }

  /**
   * Iniciar el agente
   */
  start() {
    // Ejecutar cada 10 minutos (cron: */10 * * * *)
    this.task = cron.schedule('*/10 * * * *', async () => {
      await this.performPerformanceAnalysis();
    }, {
      scheduled: true,
      timezone: 'Europe/Madrid'
    });

    logger.info('✓ Performance Agent iniciado (ejecuta cada 10 minutos)');

    return this.task;
  }

  /**
   * Detener el agente
   */
  stop() {
    if (this.task) {
      this.task.stop();
      logger.info('Performance Agent detenido');
    }
  }

  /**
   * Obtener métricas actuales (sin guardar)
   */
  getCurrentMetrics() {
    return {
      tiempoRespuesta: this.calculateAPIMetrics(),
      queryStats: this.calculateQueryMetrics(),
      recursos: this.getSystemResourceMetrics(),
      trafico: this.calculateTrafficMetrics(),
      periodoInicio: this.requestMetrics.startTime,
      periodoFin: new Date()
    };
  }
}

// Exportar instancia única (singleton)
module.exports = new PerformanceAgent();
