const { iniciarJobAlertas } = require('./alertasJob');
const { iniciarJobEstadisticas, iniciarJobLimpieza } = require('./estadisticasJob');
const { iniciarJobInsightsIA } = require('./insightsIAJob');
const logger = require('../utils/logger');

/**
 * Inicializar todos los jobs automáticos
 */
function iniciarTodosLosJobs() {
  try {
    logger.info('========================================');
    logger.info('  Inicializando Jobs Automáticos');
    logger.info('========================================');

    // Iniciar job de alertas (cada hora)
    const jobAlertas = iniciarJobAlertas();
    logger.info('✓ Job de alertas inicializado');

    // Iniciar job de estadísticas (cada 5 minutos)
    const jobEstadisticas = iniciarJobEstadisticas();
    logger.info('✓ Job de estadísticas inicializado');

    // Iniciar job de limpieza (diario a las 3:00 AM)
    const jobLimpieza = iniciarJobLimpieza();
    logger.info('✓ Job de limpieza inicializado');

    // Iniciar job de insights IA (diario a las 2:00 AM)
    const jobInsightsIA = iniciarJobInsightsIA();
    logger.info('✓ Job de insights IA inicializado');

    logger.info('========================================');
    logger.info('  Todos los jobs están activos');
    logger.info('========================================');

    return {
      jobAlertas,
      jobEstadisticas,
      jobLimpieza,
      jobInsightsIA
    };
  } catch (error) {
    logger.error('Error al inicializar jobs automáticos', error);
    throw error;
  }
}

/**
 * Detener todos los jobs
 */
function detenerTodosLosJobs(jobs) {
  try {
    if (jobs.jobAlertas) jobs.jobAlertas.stop();
    if (jobs.jobEstadisticas) jobs.jobEstadisticas.stop();
    if (jobs.jobLimpieza) jobs.jobLimpieza.stop();
    if (jobs.jobInsightsIA) jobs.jobInsightsIA.stop();

    logger.info('Todos los jobs han sido detenidos');
  } catch (error) {
    logger.error('Error al detener jobs', error);
  }
}

module.exports = {
  iniciarTodosLosJobs,
  detenerTodosLosJobs
};
