const cron = require('node-cron');
const Deposito = require('../models/Deposito');
const Alerta = require('../models/Alerta');
const logger = require('../utils/logger');

/**
 * Job automático para generar alertas
 * Se ejecuta cada hora para:
 * - Detectar depósitos próximos a vencer
 * - Detectar depósitos vencidos
 * - Detectar valores altos
 * - Actualizar estados de depósitos
 */

let jobRunning = false;

async function generarAlertas() {
  if (jobRunning) {
    logger.warn('Job de alertas ya en ejecución, omitiendo...');
    return;
  }

  jobRunning = true;
  const startTime = Date.now();

  try {
    logger.info('Iniciando job de generación de alertas automáticas');

    // Obtener todos los depósitos activos
    const depositosActivos = await Deposito.find({ activo: true })
      .populate('producto', 'codigo nombre precioUnitario');

    let alertasCreadas = {
      vencimiento: 0,
      vencidos: 0,
      valorAlto: 0,
      total: 0
    };

    for (const deposito of depositosActivos) {
      // 1. Alertas de vencimiento
      if (deposito.fechaVencimiento) {
        const diasHastaVencimiento = deposito.getDiasHastaVencimiento();

        // Depósitos vencidos
        if (diasHastaVencimiento < 0) {
          const alertaExistente = await Alerta.findOne({
            deposito: deposito._id,
            tipo: 'producto_vencido',
            resuelta: false
          });

          if (!alertaExistente) {
            await Alerta.create({
              tipo: 'producto_vencido',
              prioridad: 'alta',
              mensaje: `Depósito ${deposito.numeroDeposito} VENCIDO hace ${Math.abs(diasHastaVencimiento)} días`,
              deposito: deposito._id,
              observaciones: `Generado automáticamente por job de alertas`
            });
            alertasCreadas.vencidos++;
            alertasCreadas.total++;
          }
        }
        // Depósitos próximos a vencer (30 días)
        else if (diasHastaVencimiento >= 0 && diasHastaVencimiento <= 30) {
          const alertaExistente = await Alerta.findOne({
            deposito: deposito._id,
            tipo: 'vencimiento_proximo',
            resuelta: false
          });

          if (!alertaExistente) {
            await Alerta.crearAlertaVencimiento(deposito);
            alertasCreadas.vencimiento++;
            alertasCreadas.total++;
          }
        }
      }

      // 2. Alertas de valor alto (> 10,000€)
      if (deposito.valorTotal > 10000) {
        const alertaExistente = await Alerta.findOne({
          deposito: deposito._id,
          tipo: 'valor_alto',
          resuelta: false
        });

        if (!alertaExistente) {
          await Alerta.crearAlertaValorAlto(deposito);
          alertasCreadas.valorAlto++;
          alertasCreadas.total++;
        }
      }

      // 3. Actualizar estado del depósito si es necesario
      // El pre-save hook del modelo ya maneja esto, pero lo forzamos
      if (deposito.fechaVencimiento) {
        const estadoAnterior = deposito.estado;
        await deposito.save();

        if (estadoAnterior !== deposito.estado) {
          logger.info('Estado de depósito actualizado', {
            depositoId: deposito._id,
            numeroDeposito: deposito.numeroDeposito,
            estadoAnterior,
            estadoNuevo: deposito.estado
          });
        }
      }
    }

    // Limpiar alertas duplicadas o resueltas automáticamente
    await limpiarAlertasDuplicadas();

    const duration = Date.now() - startTime;
    logger.info('Job de alertas completado', {
      duracion: `${duration}ms`,
      depositosRevisados: depositosActivos.length,
      alertasCreadas: alertasCreadas.total,
      desglose: {
        vencimiento: alertasCreadas.vencimiento,
        vencidos: alertasCreadas.vencidos,
        valorAlto: alertasCreadas.valorAlto
      }
    });

  } catch (error) {
    logger.error('Error en job de alertas', error);
  } finally {
    jobRunning = false;
  }
}

/**
 * Limpiar alertas duplicadas y resolver alertas obsoletas
 */
async function limpiarAlertasDuplicadas() {
  try {
    // Resolver alertas de vencimiento si el depósito ya fue retirado o facturado
    const depositosNoActivos = await Deposito.find({
      $or: [
        { activo: false },
        { estado: 'retirado' },
        { estado: 'facturado' }
      ]
    }).select('_id');

    const depositosIds = depositosNoActivos.map(d => d._id);

    if (depositosIds.length > 0) {
      const resultado = await Alerta.updateMany(
        {
          deposito: { $in: depositosIds },
          resuelta: false
        },
        {
          resuelta: true,
          fechaResolucion: new Date(),
          observaciones: 'Resuelta automáticamente - depósito no activo'
        }
      );

      if (resultado.modifiedCount > 0) {
        logger.info('Alertas obsoletas resueltas automáticamente', {
          cantidad: resultado.modifiedCount
        });
      }
    }

    // Resolver alertas de vencimiento si el plazo fue extendido
    const depositosConPlazosExtendidos = await Deposito.find({
      activo: true,
      fechaVencimiento: { $exists: true }
    });

    for (const deposito of depositosConPlazosExtendidos) {
      const diasHastaVencimiento = deposito.getDiasHastaVencimiento();

      // Si tiene más de 30 días hasta vencimiento, resolver alertas de vencimiento
      if (diasHastaVencimiento > 30) {
        await Alerta.updateMany(
          {
            deposito: deposito._id,
            tipo: { $in: ['vencimiento_proximo', 'producto_vencido'] },
            resuelta: false
          },
          {
            resuelta: true,
            fechaResolucion: new Date(),
            observaciones: 'Resuelta automáticamente - plazo extendido'
          }
        );
      }
    }

  } catch (error) {
    logger.error('Error limpiando alertas duplicadas', error);
  }
}

/**
 * Iniciar el cron job
 * Se ejecuta cada hora
 */
function iniciarJobAlertas() {
  // Ejecutar cada hora en el minuto 0
  const task = cron.schedule('0 * * * *', async () => {
    await generarAlertas();
  }, {
    scheduled: true,
    timezone: 'Europe/Madrid'
  });

  logger.info('Job de alertas inicializado - se ejecutará cada hora');

  // Ejecutar inmediatamente al inicio (opcional)
  // generarAlertas();

  return task;
}

/**
 * Ejecutar job manualmente (para testing)
 */
async function ejecutarManual() {
  logger.info('Ejecutando job de alertas manualmente');
  await generarAlertas();
}

module.exports = {
  iniciarJobAlertas,
  generarAlertas,
  ejecutarManual
};
