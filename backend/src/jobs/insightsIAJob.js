/**
 * AssetFlow 3.0 - Insights IA Job
 * Job automático para generar insights mediante IA
 * Se ejecuta diariamente a las 02:00 AM
 */

const cron = require('node-cron');
const AI_Config = require('../models/AI_Config');
const AI_Insight = require('../models/AI_Insight');
const AI_Consulta = require('../models/AI_Consulta');
const Deposito = require('../models/Deposito');
const Emplazamiento = require('../models/Emplazamiento');
const Cliente = require('../models/Cliente');
const Alerta = require('../models/Alerta');
const logger = require('../utils/logger');
const { analyzeWithOpenAI } = require('../services/openaiService');
const { analyzeWithAnthropic } = require('../services/anthropicService');

/**
 * Job automático para generar insights con IA
 * Analiza el estado del sistema y genera insights accionables
 */

let jobRunning = false;

async function generarInsightsAutomaticos() {
  if (jobRunning) {
    logger.warn('Job de insights IA ya en ejecución, omitiendo...');
    return;
  }

  jobRunning = true;
  const startTime = Date.now();

  try {
    logger.info('Iniciando job de generación de insights automáticos con IA');

    // Obtener configuración activa (preferir Anthropic para análisis profundo)
    let config = await AI_Config.getActiveConfig('anthropic');
    let proveedor = 'anthropic';

    if (!config) {
      config = await AI_Config.getActiveConfig('openai');
      proveedor = 'openai';
    }

    if (!config) {
      logger.warn('No hay configuración de IA activa, omitiendo generación de insights');
      jobRunning = false;
      return;
    }

    // Verificar límite mensual
    if (config.usoMensual >= config.limiteMensual) {
      logger.warn('Límite mensual de uso de IA alcanzado, omitiendo generación de insights');
      jobRunning = false;
      return;
    }

    // Recopilar datos del sistema
    logger.info('Recopilando datos del sistema para análisis');
    const datosDelSistema = await recopilarDatosDelSistema();

    // Generar prompt para IA
    const prompt = construirPromptAnalisis(datosDelSistema);

    // Desencriptar API key
    const apiKey = config.getApiKey();
    const configWithKey = { ...config.toObject(), apiKey };

    logger.info(`Llamando a ${proveedor} para generar insights`);

    let resultado;
    try {
      if (proveedor === 'openai') {
        resultado = await analyzeWithOpenAI(
          configWithKey,
          prompt,
          datosDelSistema,
          { responseFormat: 'json', maxTokens: 3000 }
        );
      } else {
        resultado = await analyzeWithAnthropic(
          configWithKey,
          prompt,
          datosDelSistema,
          { maxTokens: 3000 }
        );
      }
    } catch (error) {
      logger.error('Error al llamar a IA para insights', { error: error.message });
      jobRunning = false;
      return;
    }

    // Parsear respuesta JSON
    let insightsData;
    try {
      insightsData = JSON.parse(resultado.respuesta);
    } catch (parseError) {
      logger.error('Error al parsear respuesta JSON de IA', {
        error: parseError.message,
        respuesta: resultado.respuesta.substring(0, 500)
      });
      jobRunning = false;
      return;
    }

    // Guardar insights en BD
    const insightsCreados = [];

    if (insightsData.insights && Array.isArray(insightsData.insights)) {
      for (const insightData of insightsData.insights) {
        try {
          // Validar campos requeridos
          if (!insightData.tipo || !insightData.titulo || !insightData.prioridad) {
            logger.warn('Insight inválido (faltan campos requeridos), omitiendo', { insightData });
            continue;
          }

          // Crear insight
          const insight = await AI_Insight.create({
            tipo: insightData.tipo,
            titulo: insightData.titulo,
            descripcion: insightData.descripcion || '',
            prioridad: insightData.prioridad,
            confianza: insightData.confianza || 0.7,
            accionesSugeridas: insightData.accionesSugeridas || [],
            generadoPor: proveedor,
            modeloUtilizado: resultado.modelo,
            datosBase: datosDelSistema,
            validezHasta: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
            estado: 'nuevo'
          });

          insightsCreados.push(insight);

          logger.info('Insight creado', {
            insightId: insight._id,
            tipo: insight.tipo,
            prioridad: insight.prioridad,
            titulo: insight.titulo
          });

        } catch (error) {
          logger.error('Error al crear insight individual', {
            error: error.message,
            insightData
          });
        }
      }
    }

    // Calcular costo
    const costoEstimado = (resultado.tokensUsados / 1000) * config.costoPor1000Tokens;

    // Guardar consulta en historial
    await AI_Consulta.create({
      tipoConsulta: 'analisis',
      proveedor,
      modelo: resultado.modelo,
      prompt,
      contexto: datosDelSistema,
      usuario: null, // Sistema automático
      respuesta: resultado.respuesta,
      respuestaJSON: insightsData,
      tokensUsados: resultado.tokensUsados,
      costoEstimado,
      tiempoRespuesta: resultado.tiempoRespuesta,
      tags: ['insights', 'automatico', 'job'],
      fechaConsulta: new Date()
    });

    // Incrementar uso mensual
    await AI_Config.incrementarUso(config._id, resultado.tokensUsados);

    // Limpiar insights antiguos (más de 30 días)
    await limpiarInsightsAntiguos();

    const duration = Date.now() - startTime;
    logger.info('Job de insights IA completado exitosamente', {
      duracion: `${duration}ms`,
      insightsCreados: insightsCreados.length,
      proveedor,
      modelo: resultado.modelo,
      tokensUsados: resultado.tokensUsados,
      costoEstimado: `€${costoEstimado.toFixed(4)}`
    });

  } catch (error) {
    logger.error('Error en job de insights IA', {
      error: error.message,
      stack: error.stack
    });
  } finally {
    jobRunning = false;
  }
}

/**
 * Recopila datos del sistema para análisis
 */
async function recopilarDatosDelSistema() {
  try {
    // Obtener datos principales
    const [
      depositos,
      alertas,
      emplazamientos,
      clientes,
      depositosVencidos,
      depositosProximosVencer
    ] = await Promise.all([
      Deposito.find({ activo: true })
        .populate('producto', 'codigo nombre categoria precioUnitario')
        .populate('cliente', 'nombre ciudad')
        .populate('emplazamiento', 'nombre ciudad provincia'),
      Alerta.find({ resuelta: false }),
      Emplazamiento.find({ estado: 'activo' })
        .populate('cliente', 'nombre'),
      Cliente.find({ activo: true }),
      Deposito.getVencidos(),
      Deposito.getProximosVencer(30)
    ]);

    // Calcular estadísticas
    const valorTotalDepositado = depositos.reduce((sum, d) => sum + d.valorTotal, 0);
    const valorPromedio = depositos.length > 0 ? valorTotalDepositado / depositos.length : 0;

    // Agrupar por cliente
    const depositosPorCliente = {};
    for (const deposito of depositos) {
      const clienteNombre = deposito.cliente?.nombre || 'Sin asignar';
      if (!depositosPorCliente[clienteNombre]) {
        depositosPorCliente[clienteNombre] = {
          cantidad: 0,
          valorTotal: 0
        };
      }
      depositosPorCliente[clienteNombre].cantidad++;
      depositosPorCliente[clienteNombre].valorTotal += deposito.valorTotal;
    }

    // Top 5 clientes por valor
    const topClientes = Object.entries(depositosPorCliente)
      .sort(([, a], [, b]) => b.valorTotal - a.valorTotal)
      .slice(0, 5)
      .map(([nombre, data]) => ({ nombre, ...data }));

    // Distribución geográfica
    const distribucionGeografica = {};
    for (const deposito of depositos) {
      const ciudad = deposito.emplazamiento?.ciudad || 'Sin especificar';
      if (!distribucionGeografica[ciudad]) {
        distribucionGeografica[ciudad] = { cantidad: 0, valorTotal: 0 };
      }
      distribucionGeografica[ciudad].cantidad++;
      distribucionGeografica[ciudad].valorTotal += deposito.valorTotal;
    }

    // Alertas por prioridad
    const alertasPorPrioridad = {
      critica: alertas.filter(a => a.prioridad === 'critica').length,
      alta: alertas.filter(a => a.prioridad === 'alta').length,
      media: alertas.filter(a => a.prioridad === 'media').length,
      baja: alertas.filter(a => a.prioridad === 'baja').length
    };

    return {
      resumen: {
        totalDepositos: depositos.length,
        valorTotalDepositado,
        valorPromedio,
        totalEmplazamientos: emplazamientos.length,
        totalClientes: clientes.length,
        depositosVencidos: depositosVencidos.length,
        depositosProximosVencer: depositosProximosVencer.length,
        alertasPendientes: alertas.length
      },
      topClientes,
      distribucionGeografica,
      alertasPorPrioridad,
      riesgos: {
        valorEnRiesgo: depositosVencidos.reduce((sum, d) => sum + d.valorTotal, 0) +
                       depositosProximosVencer.reduce((sum, d) => sum + d.valorTotal, 0),
        depositosEnRiesgo: depositosVencidos.length + depositosProximosVencer.length
      },
      fecha: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Error al recopilar datos del sistema', { error: error.message });
    throw error;
  }
}

/**
 * Construye el prompt para análisis de IA
 */
function construirPromptAnalisis(datos) {
  return `Analiza el estado actual del sistema AssetFlow y genera entre 3 y 5 insights accionables de alto valor.

DATOS DEL SISTEMA:
- Total de depósitos activos: ${datos.resumen.totalDepositos}
- Valor total depositado: €${datos.resumen.valorTotalDepositado.toFixed(2)}
- Depósitos vencidos: ${datos.resumen.depositosVencidos}
- Depósitos próximos a vencer (30 días): ${datos.resumen.depositosProximosVencer}
- Alertas pendientes: ${datos.resumen.alertasPendientes} (${datos.alertasPorPrioridad.critica} críticas)
- Valor en riesgo: €${datos.riesgos.valorEnRiesgo.toFixed(2)}

TOP CLIENTES:
${datos.topClientes.map(c => `- ${c.nombre}: ${c.cantidad} depósitos, €${c.valorTotal.toFixed(2)}`).join('\n')}

CRITERIOS PARA INSIGHTS:
1. PRIORIZA situaciones críticas que requieran acción inmediata
2. IDENTIFICA oportunidades de optimización o mejora
3. DETECTA patrones o tendencias relevantes
4. EVALÚA riesgos financieros u operacionales
5. PROPORCIONA recomendaciones concretas y accionables

TIPOS DE INSIGHT:
- "alerta": Situaciones urgentes que requieren atención inmediata
- "oportunidad": Mejoras potenciales o beneficios no aprovechados
- "riesgo": Amenazas potenciales que requieren mitigación
- "recomendacion": Sugerencias para optimizar operaciones

PRIORIDAD:
- "critica": Requiere acción inmediata (pérdidas potenciales altas)
- "alta": Importante, debe atenderse pronto
- "media": Relevante, planificar acción
- "baja": Informativo, sin urgencia

Responde ÚNICAMENTE con un JSON válido en este formato exacto:
{
  "insights": [
    {
      "tipo": "alerta|oportunidad|riesgo|recomendacion",
      "titulo": "Título claro y conciso",
      "descripcion": "Descripción detallada del insight con datos específicos",
      "prioridad": "baja|media|alta|critica",
      "confianza": 0.8,
      "accionesSugeridas": [
        {
          "accion": "Acción específica a tomar",
          "razonamiento": "Por qué es importante esta acción",
          "impactoEstimado": "Impacto cuantificado cuando sea posible",
          "prioridad": 1
        }
      ]
    }
  ]
}

IMPORTANTE: Responde SOLO con el JSON, sin texto adicional antes o después.`;
}

/**
 * Limpia insights antiguos y expirados
 */
async function limpiarInsightsAntiguos() {
  try {
    // Marcar como descartados los insights expirados que aún están en estado 'nuevo'
    const fechaActual = new Date();

    const resultadoExpirados = await AI_Insight.updateMany(
      {
        validezHasta: { $lt: fechaActual },
        estado: { $in: ['nuevo', 'visto'] }
      },
      {
        estado: 'descartado'
      }
    );

    if (resultadoExpirados.modifiedCount > 0) {
      logger.info('Insights expirados descartados automáticamente', {
        cantidad: resultadoExpirados.modifiedCount
      });
    }

    // Eliminar insights muy antiguos (más de 90 días) que ya están resueltos o descartados
    const fecha90DiasAtras = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const resultadoEliminados = await AI_Insight.deleteMany({
      fechaGeneracion: { $lt: fecha90DiasAtras },
      estado: { $in: ['resuelto', 'descartado'] }
    });

    if (resultadoEliminados.deletedCount > 0) {
      logger.info('Insights antiguos eliminados', {
        cantidad: resultadoEliminados.deletedCount
      });
    }

  } catch (error) {
    logger.error('Error al limpiar insights antiguos', { error: error.message });
  }
}

/**
 * Iniciar el cron job
 * Se ejecuta diariamente a las 02:00 AM
 */
function iniciarJobInsightsIA() {
  // Ejecutar diariamente a las 02:00 AM
  const task = cron.schedule('0 2 * * *', async () => {
    await generarInsightsAutomaticos();
  }, {
    scheduled: true,
    timezone: 'Europe/Madrid'
  });

  logger.info('Job de insights IA inicializado - se ejecutará diariamente a las 02:00 AM');

  return task;
}

/**
 * Ejecutar job manualmente (para testing)
 */
async function ejecutarManual() {
  logger.info('Ejecutando job de insights IA manualmente');
  await generarInsightsAutomaticos();
}

module.exports = {
  iniciarJobInsightsIA,
  generarInsightsAutomaticos,
  ejecutarManual
};
