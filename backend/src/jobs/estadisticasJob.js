const cron = require('node-cron');
const Deposito = require('../models/Deposito');
const Cliente = require('../models/Cliente');
const Emplazamiento = require('../models/Emplazamiento');
const Producto = require('../models/Producto');
const Alerta = require('../models/Alerta');
const Movimiento = require('../models/Movimiento');
const logger = require('../utils/logger');

/**
 * Job automático para actualizar estadísticas y KPIs
 * Se ejecuta cada 5 minutos para mantener las métricas actualizadas
 */

let jobRunning = false;
let ultimasEstadisticas = null;

async function actualizarEstadisticas() {
  if (jobRunning) {
    logger.warn('Job de estadísticas ya en ejecución, omitiendo...');
    return;
  }

  jobRunning = true;
  const startTime = Date.now();

  try {
    logger.debug('Iniciando job de actualización de estadísticas');

    // Calcular estadísticas globales
    const estadisticas = await calcularEstadisticasGlobales();

    // Guardar en memoria para acceso rápido (podría guardarse en Redis en producción)
    ultimasEstadisticas = {
      ...estadisticas,
      ultimaActualizacion: new Date()
    };

    const duration = Date.now() - startTime;
    logger.debug('Job de estadísticas completado', {
      duracion: `${duration}ms`,
      totalDepositos: estadisticas.depositos.total,
      valorTotal: estadisticas.depositos.valorTotal
    });

  } catch (error) {
    logger.error('Error en job de estadísticas', error);
  } finally {
    jobRunning = false;
  }
}

/**
 * Calcular estadísticas globales del sistema
 */
async function calcularEstadisticasGlobales() {
  const [
    totalesDepositos,
    depositosPorEstado,
    totalesClientes,
    totalesEmplazamientos,
    totalesProductos,
    totalesAlertas,
    movimientosHoy,
    tendencia7Dias
  ] = await Promise.all([
    // Totales de depósitos
    Deposito.aggregate([
      { $match: { activo: true } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          cantidadTotal: { $sum: '$cantidad' },
          valorTotal: { $sum: '$valorTotal' },
          valorPromedio: { $avg: '$valorTotal' }
        }
      }
    ]),

    // Depósitos por estado
    Deposito.aggregate([
      { $match: { activo: true } },
      {
        $group: {
          _id: '$estado',
          count: { $sum: 1 },
          valorTotal: { $sum: '$valorTotal' }
        }
      }
    ]),

    // Totales de clientes
    Cliente.countDocuments({ activo: true }),

    // Totales de emplazamientos
    Emplazamiento.countDocuments({ activo: true }),

    // Totales de productos
    Producto.countDocuments({ activo: true }),

    // Totales de alertas
    Promise.all([
      Alerta.countDocuments({ resuelta: false }),
      Alerta.countDocuments({ resuelta: false, prioridad: 'alta' }),
      Alerta.countDocuments({ resuelta: false, tipo: 'vencimiento_proximo' }),
      Alerta.countDocuments({ resuelta: false, tipo: 'producto_vencido' })
    ]),

    // Movimientos de hoy
    Movimiento.aggregate([
      {
        $match: {
          fecha: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      },
      {
        $group: {
          _id: '$tipo',
          count: { $sum: 1 }
        }
      }
    ]),

    // Tendencia últimos 7 días
    Deposito.aggregate([
      {
        $match: {
          fechaDeposito: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        $group: {
          _id: {
            fecha: { $dateToString: { format: '%Y-%m-%d', date: '$fechaDeposito' } }
          },
          count: { $sum: 1 },
          valorTotal: { $sum: '$valorTotal' }
        }
      },
      { $sort: { '_id.fecha': 1 } }
    ])
  ]);

  return {
    depositos: {
      total: totalesDepositos[0]?.total || 0,
      cantidadTotal: totalesDepositos[0]?.cantidadTotal || 0,
      valorTotal: totalesDepositos[0]?.valorTotal || 0,
      valorPromedio: totalesDepositos[0]?.valorPromedio || 0,
      porEstado: depositosPorEstado.reduce((acc, item) => {
        acc[item._id] = {
          count: item.count,
          valorTotal: item.valorTotal
        };
        return acc;
      }, {})
    },
    clientes: {
      total: totalesClientes
    },
    emplazamientos: {
      total: totalesEmplazamientos
    },
    productos: {
      total: totalesProductos
    },
    alertas: {
      total: totalesAlertas[0],
      criticas: totalesAlertas[1],
      proximosVencer: totalesAlertas[2],
      vencidos: totalesAlertas[3]
    },
    movimientosHoy: movimientosHoy.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    tendencia7Dias: tendencia7Dias.map(t => ({
      fecha: t._id.fecha,
      count: t.count,
      valorTotal: t.valorTotal
    }))
  };
}

/**
 * Obtener las últimas estadísticas calculadas
 */
function obtenerEstadisticas() {
  return ultimasEstadisticas;
}

/**
 * Iniciar el cron job
 * Se ejecuta cada 5 minutos
 */
function iniciarJobEstadisticas() {
  // Ejecutar cada 5 minutos
  const task = cron.schedule('*/5 * * * *', async () => {
    await actualizarEstadisticas();
  }, {
    scheduled: true,
    timezone: 'Europe/Madrid'
  });

  logger.info('Job de estadísticas inicializado - se ejecutará cada 5 minutos');

  // Ejecutar inmediatamente al inicio
  actualizarEstadisticas();

  return task;
}

/**
 * Ejecutar job manualmente (para testing)
 */
async function ejecutarManual() {
  logger.info('Ejecutando job de estadísticas manualmente');
  await actualizarEstadisticas();
  return ultimasEstadisticas;
}

/**
 * Job para limpiar datos antiguos (opcional)
 * Se ejecuta diariamente a las 3:00 AM
 */
function iniciarJobLimpieza() {
  const task = cron.schedule('0 3 * * *', async () => {
    try {
      logger.info('Iniciando job de limpieza de datos');

      // Limpiar alertas resueltas antiguas (más de 90 días)
      const hace90Dias = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const alertasEliminadas = await Alerta.deleteMany({
        resuelta: true,
        fechaResolucion: { $lt: hace90Dias }
      });

      // Limpiar logs antiguos (esto dependería de tu sistema de logs)
      // Por ahora solo registramos la acción

      logger.info('Job de limpieza completado', {
        alertasEliminadas: alertasEliminadas.deletedCount
      });

    } catch (error) {
      logger.error('Error en job de limpieza', error);
    }
  }, {
    scheduled: true,
    timezone: 'Europe/Madrid'
  });

  logger.info('Job de limpieza inicializado - se ejecutará diariamente a las 3:00 AM');

  return task;
}

module.exports = {
  iniciarJobEstadisticas,
  iniciarJobLimpieza,
  actualizarEstadisticas,
  obtenerEstadisticas,
  ejecutarManual
};
