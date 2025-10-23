/**
 * AssetFlow 3.0 - IA Controller
 * Controlador para el módulo de Inteligencia Artificial
 */

const AI_Config = require('../models/AI_Config');
const AI_Consulta = require('../models/AI_Consulta');
const AI_Insight = require('../models/AI_Insight');
const Deposito = require('../models/Deposito');
const Emplazamiento = require('../models/Emplazamiento');
const Cliente = require('../models/Cliente');
const Alerta = require('../models/Alerta');
const { asyncHandler } = require('../utils/errorHandler');
const { NotFoundError, ValidationError, AppError } = require('../utils/errorHandler');
const logger = require('../utils/logger');
const { callOpenAI, analyzeWithOpenAI, chatWithOpenAI } = require('../services/openaiService');
const { callAnthropic, analyzeWithAnthropic, chatWithAnthropic } = require('../services/anthropicService');

// ==================== CONFIGURACIÓN IA ====================

/**
 * @desc    Obtener todas las configuraciones de IA
 * @route   GET /api/ia/config
 * @access  Private (Admin)
 */
exports.getConfigs = asyncHandler(async (req, res) => {
  const configs = await AI_Config.find()
    .populate('creadoPor', 'name email')
    .sort({ proveedor: 1, prioridadUso: 1 });

  res.status(200).json({
    success: true,
    data: {
      configs: configs.map(c => ({
        _id: c._id,
        proveedor: c.proveedor,
        nombreDisplay: c.nombreDisplay,
        apiKeyMasked: c.apiKeyMasked,
        apiUrl: c.apiUrl,
        modelo: c.modelo,
        maxTokens: c.maxTokens,
        temperatura: c.temperatura,
        activo: c.activo,
        prioridadUso: c.prioridadUso,
        costoPor1000Tokens: c.costoPor1000Tokens,
        limiteMensual: c.limiteMensual,
        usoMensual: c.usoMensual,
        creadoPor: c.creadoPor,
        notas: c.notas,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      }))
    }
  });
});

/**
 * @desc    Obtener configuración de IA por ID
 * @route   GET /api/ia/config/:id
 * @access  Private (Admin)
 */
exports.getConfigById = asyncHandler(async (req, res) => {
  const config = await AI_Config.findById(req.params.id)
    .populate('creadoPor', 'name email');

  if (!config) {
    throw new NotFoundError('Configuración de IA');
  }

  res.status(200).json({
    success: true,
    data: {
      config: {
        _id: config._id,
        proveedor: config.proveedor,
        nombreDisplay: config.nombreDisplay,
        apiKeyMasked: config.apiKeyMasked,
        apiUrl: config.apiUrl,
        modelo: config.modelo,
        maxTokens: config.maxTokens,
        temperatura: config.temperatura,
        activo: config.activo,
        prioridadUso: config.prioridadUso,
        costoPor1000Tokens: config.costoPor1000Tokens,
        limiteMensual: config.limiteMensual,
        usoMensual: config.usoMensual,
        creadoPor: config.creadoPor,
        notas: config.notas,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      }
    }
  });
});

/**
 * @desc    Crear nueva configuración de IA
 * @route   POST /api/ia/config
 * @access  Private (Admin)
 */
exports.createConfig = asyncHandler(async (req, res) => {
  const {
    proveedor,
    nombreDisplay,
    apiKey,
    apiUrl,
    modelo,
    maxTokens,
    temperatura,
    activo,
    prioridadUso,
    costoPor1000Tokens,
    limiteMensual,
    notas
  } = req.body;

  // Validar campos requeridos
  if (!proveedor || !nombreDisplay || !apiKey || !modelo) {
    throw new ValidationError('Proveedor, nombre, API key y modelo son obligatorios');
  }

  // Validar proveedor
  if (!['openai', 'anthropic'].includes(proveedor)) {
    throw new ValidationError('Proveedor debe ser "openai" o "anthropic"');
  }

  // Crear configuración
  const config = new AI_Config({
    proveedor,
    nombreDisplay,
    modelo,
    apiUrl,
    maxTokens,
    temperatura,
    activo,
    prioridadUso,
    costoPor1000Tokens,
    limiteMensual,
    notas,
    creadoPor: req.user.id
  });

  // Encriptar API key
  config.setApiKey(apiKey);

  await config.save();
  await config.populate('creadoPor', 'name email');

  logger.info('Configuración de IA creada', {
    configId: config._id,
    proveedor: config.proveedor,
    nombreDisplay: config.nombreDisplay,
    userId: req.user.id
  });

  res.status(201).json({
    success: true,
    message: 'Configuración de IA creada exitosamente',
    data: {
      config: {
        _id: config._id,
        proveedor: config.proveedor,
        nombreDisplay: config.nombreDisplay,
        apiKeyMasked: config.apiKeyMasked,
        apiUrl: config.apiUrl,
        modelo: config.modelo,
        maxTokens: config.maxTokens,
        temperatura: config.temperatura,
        activo: config.activo,
        prioridadUso: config.prioridadUso,
        costoPor1000Tokens: config.costoPor1000Tokens,
        limiteMensual: config.limiteMensual,
        usoMensual: config.usoMensual,
        creadoPor: config.creadoPor,
        notas: config.notas,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      }
    }
  });
});

/**
 * @desc    Actualizar configuración de IA
 * @route   PUT /api/ia/config/:id
 * @access  Private (Admin)
 */
exports.updateConfig = asyncHandler(async (req, res) => {
  let config = await AI_Config.findById(req.params.id);

  if (!config) {
    throw new NotFoundError('Configuración de IA');
  }

  const {
    nombreDisplay,
    apiKey,
    apiUrl,
    modelo,
    maxTokens,
    temperatura,
    activo,
    prioridadUso,
    costoPor1000Tokens,
    limiteMensual,
    notas
  } = req.body;

  // Actualizar campos
  if (nombreDisplay !== undefined) config.nombreDisplay = nombreDisplay;
  if (apiUrl !== undefined) config.apiUrl = apiUrl;
  if (modelo !== undefined) config.modelo = modelo;
  if (maxTokens !== undefined) config.maxTokens = maxTokens;
  if (temperatura !== undefined) config.temperatura = temperatura;
  if (activo !== undefined) config.activo = activo;
  if (prioridadUso !== undefined) config.prioridadUso = prioridadUso;
  if (costoPor1000Tokens !== undefined) config.costoPor1000Tokens = costoPor1000Tokens;
  if (limiteMensual !== undefined) config.limiteMensual = limiteMensual;
  if (notas !== undefined) config.notas = notas;

  // Actualizar API key si se proporciona
  if (apiKey) {
    config.setApiKey(apiKey);
  }

  await config.save();
  await config.populate('creadoPor', 'name email');

  logger.info('Configuración de IA actualizada', {
    configId: config._id,
    proveedor: config.proveedor,
    nombreDisplay: config.nombreDisplay,
    userId: req.user.id
  });

  res.status(200).json({
    success: true,
    message: 'Configuración de IA actualizada exitosamente',
    data: {
      config: {
        _id: config._id,
        proveedor: config.proveedor,
        nombreDisplay: config.nombreDisplay,
        apiKeyMasked: config.apiKeyMasked,
        apiUrl: config.apiUrl,
        modelo: config.modelo,
        maxTokens: config.maxTokens,
        temperatura: config.temperatura,
        activo: config.activo,
        prioridadUso: config.prioridadUso,
        costoPor1000Tokens: config.costoPor1000Tokens,
        limiteMensual: config.limiteMensual,
        usoMensual: config.usoMensual,
        creadoPor: config.creadoPor,
        notas: config.notas,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      }
    }
  });
});

/**
 * @desc    Eliminar configuración de IA
 * @route   DELETE /api/ia/config/:id
 * @access  Private (Admin)
 */
exports.deleteConfig = asyncHandler(async (req, res) => {
  const config = await AI_Config.findById(req.params.id);

  if (!config) {
    throw new NotFoundError('Configuración de IA');
  }

  await config.deleteOne();

  logger.warn('Configuración de IA eliminada', {
    configId: config._id,
    proveedor: config.proveedor,
    nombreDisplay: config.nombreDisplay,
    userId: req.user.id
  });

  res.status(200).json({
    success: true,
    message: 'Configuración de IA eliminada exitosamente'
  });
});

// ==================== CHAT IA ====================

/**
 * @desc    Chat conversacional con IA
 * @route   POST /api/ia/chat
 * @access  Private
 */
exports.chat = asyncHandler(async (req, res) => {
  const { mensaje, historial, proveedor } = req.body;

  if (!mensaje) {
    throw new ValidationError('El mensaje es obligatorio');
  }

  // Obtener configuración activa
  const proveedorSeleccionado = proveedor || 'openai';
  const config = await AI_Config.getActiveConfig(proveedorSeleccionado);

  if (!config) {
    throw new AppError(`No hay configuración activa para ${proveedorSeleccionado}`, 400);
  }

  // Verificar límite mensual
  if (config.usoMensual >= config.limiteMensual) {
    throw new AppError('Límite mensual de uso de IA alcanzado', 429);
  }

  // Obtener contexto del sistema
  const context = await obtenerContextoSistema();

  // Desencriptar API key
  const apiKey = config.getApiKey();
  const configWithKey = { ...config.toObject(), apiKey };

  let resultado;
  const startTime = Date.now();

  try {
    if (proveedorSeleccionado === 'openai') {
      resultado = await chatWithOpenAI(configWithKey, historial || [], mensaje, context);
    } else {
      resultado = await chatWithAnthropic(configWithKey, historial || [], mensaje, context);
    }
  } catch (error) {
    logger.error('Error en chat con IA', { error: error.message, proveedor: proveedorSeleccionado });
    throw error;
  }

  const endTime = Date.now();
  const tiempoRespuesta = endTime - startTime;

  // Calcular costo estimado
  const costoEstimado = (resultado.tokensUsados / 1000) * config.costoPor1000Tokens;

  // Guardar consulta en historial
  const consulta = await AI_Consulta.create({
    tipoConsulta: 'chat',
    proveedor: proveedorSeleccionado,
    modelo: resultado.modelo,
    prompt: mensaje,
    contexto: { historial: historial || [] },
    usuario: req.user.id,
    respuesta: resultado.respuesta,
    tokensUsados: resultado.tokensUsados,
    costoEstimado,
    tiempoRespuesta,
    fechaConsulta: new Date()
  });

  // Incrementar uso mensual
  await AI_Config.incrementarUso(config._id, resultado.tokensUsados);

  res.status(200).json({
    success: true,
    data: {
      respuesta: resultado.respuesta,
      consultaId: consulta._id,
      metadata: {
        proveedor: proveedorSeleccionado,
        modelo: resultado.modelo,
        tokensUsados: resultado.tokensUsados,
        costoEstimado,
        tiempoRespuesta
      }
    }
  });
});

// ==================== ANÁLISIS IA ====================

/**
 * @desc    Analizar vencimientos con IA
 * @route   POST /api/ia/analizar/vencimientos
 * @access  Private
 */
exports.analizarVencimientos = asyncHandler(async (req, res) => {
  const { proveedor, dias } = req.body;

  // Obtener configuración activa
  const proveedorSeleccionado = proveedor || 'openai';
  const config = await AI_Config.getActiveConfig(proveedorSeleccionado);

  if (!config) {
    throw new AppError(`No hay configuración activa para ${proveedorSeleccionado}`, 400);
  }

  // Obtener depósitos próximos a vencer
  const diasAnalisis = dias || 30;
  const depositosProximos = await Deposito.getProximosVencer(diasAnalisis);
  const depositosVencidos = await Deposito.getVencidos();

  // Preparar contexto
  const context = {
    depositosProximos: depositosProximos.map(d => ({
      numeroDeposito: d.numeroDeposito,
      cliente: d.cliente?.nombre,
      emplazamiento: d.emplazamiento?.nombre,
      valorTotal: d.valorTotal,
      diasHastaVencimiento: d.getDiasHastaVencimiento(),
      fechaVencimiento: d.fechaVencimiento
    })),
    depositosVencidos: depositosVencidos.map(d => ({
      numeroDeposito: d.numeroDeposito,
      cliente: d.cliente?.nombre,
      valorTotal: d.valorTotal,
      diasVencido: Math.abs(d.getDiasHastaVencimiento())
    })),
    totalProximos: depositosProximos.length,
    totalVencidos: depositosVencidos.length,
    valorEnRiesgo: depositosProximos.reduce((sum, d) => sum + d.valorTotal, 0) +
                   depositosVencidos.reduce((sum, d) => sum + d.valorTotal, 0)
  };

  const prompt = `Analiza los depósitos próximos a vencer y vencidos, y genera un reporte ejecutivo con:

1. Resumen de la situación actual
2. Depósitos de mayor riesgo (priorizados por valor y urgencia)
3. Recomendaciones accionables para cada caso
4. Plan de acción prioritario

Proporciona el análisis en formato estructurado y profesional.`;

  // Desencriptar API key
  const apiKey = config.getApiKey();
  const configWithKey = { ...config.toObject(), apiKey };

  let resultado;
  const startTime = Date.now();

  try {
    if (proveedorSeleccionado === 'openai') {
      resultado = await analyzeWithOpenAI(configWithKey, prompt, context);
    } else {
      resultado = await analyzeWithAnthropic(configWithKey, prompt, context);
    }
  } catch (error) {
    logger.error('Error en análisis de vencimientos', { error: error.message });
    throw error;
  }

  const endTime = Date.now();
  const tiempoRespuesta = endTime - startTime;

  // Calcular costo
  const costoEstimado = (resultado.tokensUsados / 1000) * config.costoPor1000Tokens;

  // Guardar consulta
  await AI_Consulta.create({
    tipoConsulta: 'analisis',
    proveedor: proveedorSeleccionado,
    modelo: resultado.modelo,
    prompt,
    contexto: context,
    usuario: req.user.id,
    respuesta: resultado.respuesta,
    tokensUsados: resultado.tokensUsados,
    costoEstimado,
    tiempoRespuesta,
    tags: ['vencimientos', 'analisis'],
    fechaConsulta: new Date()
  });

  // Incrementar uso mensual
  await AI_Config.incrementarUso(config._id, resultado.tokensUsados);

  res.status(200).json({
    success: true,
    data: {
      analisis: resultado.respuesta,
      estadisticas: {
        totalProximos: context.totalProximos,
        totalVencidos: context.totalVencidos,
        valorEnRiesgo: context.valorEnRiesgo
      },
      metadata: {
        proveedor: proveedorSeleccionado,
        modelo: resultado.modelo,
        tokensUsados: resultado.tokensUsados,
        costoEstimado,
        tiempoRespuesta
      }
    }
  });
});

/**
 * @desc    Optimizar depósitos con IA
 * @route   POST /api/ia/optimizar/depositos
 * @access  Private
 */
exports.optimizarDepositos = asyncHandler(async (req, res) => {
  const { proveedor } = req.body;

  // Obtener configuración activa
  const proveedorSeleccionado = proveedor || 'anthropic'; // Claude es mejor para análisis profundo
  const config = await AI_Config.getActiveConfig(proveedorSeleccionado);

  if (!config) {
    throw new AppError(`No hay configuración activa para ${proveedorSeleccionado}`, 400);
  }

  // Obtener datos para análisis
  const [depositos, emplazamientos, estadisticas] = await Promise.all([
    Deposito.find({ activo: true })
      .populate('producto', 'codigo nombre categoria')
      .populate('cliente', 'nombre')
      .populate('emplazamiento', 'nombre ciudad provincia'),
    Emplazamiento.find({ estado: 'activo' })
      .populate('cliente', 'nombre'),
    obtenerEstadisticasGenerales()
  ]);

  // Preparar contexto
  const context = {
    totalDepositos: depositos.length,
    valorTotalDepositado: depositos.reduce((sum, d) => sum + d.valorTotal, 0),
    depositosPorEmplazamiento: agruparPor(depositos, 'emplazamiento'),
    depositosPorProducto: agruparPor(depositos, 'producto'),
    distribucionGeografica: agruparPorCiudad(depositos),
    emplazamientos: emplazamientos.map(e => ({
      nombre: e.nombre,
      cliente: e.cliente?.nombre,
      ciudad: e.ciudad,
      capacidadM3: e.capacidadM3,
      depositosActivos: depositos.filter(d => d.emplazamiento?._id?.toString() === e._id.toString()).length
    })),
    estadisticas
  };

  const prompt = `Analiza la distribución actual de depósitos y genera recomendaciones de optimización enfocadas en:

1. Consolidación de depósitos (identificar oportunidades de unificar)
2. Optimización geográfica (mejor distribución territorial)
3. Productos con mayor inmovilización de capital
4. Emplazamientos subutilizados o sobrecargados
5. Oportunidades de reducción de costos

Proporciona recomendaciones concretas y accionables con impacto estimado.`;

  // Desencriptar API key
  const apiKey = config.getApiKey();
  const configWithKey = { ...config.toObject(), apiKey };

  let resultado;
  const startTime = Date.now();

  try {
    if (proveedorSeleccionado === 'openai') {
      resultado = await analyzeWithOpenAI(configWithKey, prompt, context);
    } else {
      resultado = await analyzeWithAnthropic(configWithKey, prompt, context);
    }
  } catch (error) {
    logger.error('Error en optimización de depósitos', { error: error.message });
    throw error;
  }

  const endTime = Date.now();
  const tiempoRespuesta = endTime - startTime;

  // Calcular costo
  const costoEstimado = (resultado.tokensUsados / 1000) * config.costoPor1000Tokens;

  // Guardar consulta
  await AI_Consulta.create({
    tipoConsulta: 'optimizacion',
    proveedor: proveedorSeleccionado,
    modelo: resultado.modelo,
    prompt,
    contexto: context,
    usuario: req.user.id,
    respuesta: resultado.respuesta,
    tokensUsados: resultado.tokensUsados,
    costoEstimado,
    tiempoRespuesta,
    tags: ['optimizacion', 'depositos'],
    fechaConsulta: new Date()
  });

  // Incrementar uso mensual
  await AI_Config.incrementarUso(config._id, resultado.tokensUsados);

  res.status(200).json({
    success: true,
    data: {
      analisis: resultado.respuesta,
      estadisticas: {
        totalDepositos: context.totalDepositos,
        valorTotalDepositado: context.valorTotalDepositado,
        totalEmplazamientos: emplazamientos.length
      },
      metadata: {
        proveedor: proveedorSeleccionado,
        modelo: resultado.modelo,
        tokensUsados: resultado.tokensUsados,
        costoEstimado,
        tiempoRespuesta
      }
    }
  });
});

/**
 * @desc    Generar reporte ejecutivo con IA
 * @route   POST /api/ia/generar-reporte/:periodo
 * @access  Private
 */
exports.generarReporte = asyncHandler(async (req, res) => {
  const { periodo } = req.params; // 'semanal', 'mensual', 'trimestral'
  const { proveedor } = req.body;

  // Validar periodo
  if (!['semanal', 'mensual', 'trimestral'].includes(periodo)) {
    throw new ValidationError('Periodo debe ser: semanal, mensual o trimestral');
  }

  // Obtener configuración activa
  const proveedorSeleccionado = proveedor || 'anthropic';
  const config = await AI_Config.getActiveConfig(proveedorSeleccionado);

  if (!config) {
    throw new AppError(`No hay configuración activa para ${proveedorSeleccionado}`, 400);
  }

  // Calcular fechas según periodo
  const fechaHasta = new Date();
  let fechaDesde = new Date();

  switch (periodo) {
    case 'semanal':
      fechaDesde.setDate(fechaDesde.getDate() - 7);
      break;
    case 'mensual':
      fechaDesde.setMonth(fechaDesde.getMonth() - 1);
      break;
    case 'trimestral':
      fechaDesde.setMonth(fechaDesde.getMonth() - 3);
      break;
  }

  // Obtener datos del periodo
  const [depositos, alertas, estadisticas] = await Promise.all([
    Deposito.find({
      createdAt: { $gte: fechaDesde, $lte: fechaHasta }
    }).populate('producto cliente emplazamiento'),
    Alerta.find({
      fechaCreacion: { $gte: fechaDesde, $lte: fechaHasta }
    }),
    obtenerEstadisticasGenerales()
  ]);

  // Preparar contexto
  const context = {
    periodo,
    fechaDesde,
    fechaHasta,
    depositosCreados: depositos.length,
    valorDepositadoPeriodo: depositos.reduce((sum, d) => sum + d.valorTotal, 0),
    alertasGeneradas: alertas.length,
    alertasCriticas: alertas.filter(a => a.prioridad === 'critica').length,
    estadisticas
  };

  const prompt = `Genera un reporte ejecutivo ${periodo} para AssetFlow 3.0 que incluya:

1. RESUMEN EJECUTIVO
   - Situación general del periodo
   - Métricas clave y su evolución

2. KPIS PRINCIPALES
   - Valor total depositado y su variación
   - Número de depósitos activos
   - Alertas generadas y su criticidad

3. INSIGHTS CLAVE
   - Tendencias identificadas
   - Puntos de atención
   - Oportunidades detectadas

4. RIESGOS Y ALERTAS
   - Situaciones críticas
   - Riesgos potenciales

5. RECOMENDACIONES
   - Acciones prioritarias
   - Mejoras propuestas

Formato: Profesional, conciso y accionable.`;

  // Desencriptar API key
  const apiKey = config.getApiKey();
  const configWithKey = { ...config.toObject(), apiKey };

  let resultado;
  const startTime = Date.now();

  try {
    if (proveedorSeleccionado === 'openai') {
      resultado = await analyzeWithOpenAI(configWithKey, prompt, context);
    } else {
      resultado = await analyzeWithAnthropic(configWithKey, prompt, context);
    }
  } catch (error) {
    logger.error('Error en generación de reporte', { error: error.message });
    throw error;
  }

  const endTime = Date.now();
  const tiempoRespuesta = endTime - startTime;

  // Calcular costo
  const costoEstimado = (resultado.tokensUsados / 1000) * config.costoPor1000Tokens;

  // Guardar consulta
  await AI_Consulta.create({
    tipoConsulta: 'reporte',
    proveedor: proveedorSeleccionado,
    modelo: resultado.modelo,
    prompt,
    contexto: context,
    usuario: req.user.id,
    respuesta: resultado.respuesta,
    tokensUsados: resultado.tokensUsados,
    costoEstimado,
    tiempoRespuesta,
    tags: ['reporte', periodo],
    guardado: true,
    fechaConsulta: new Date()
  });

  // Incrementar uso mensual
  await AI_Config.incrementarUso(config._id, resultado.tokensUsados);

  res.status(200).json({
    success: true,
    data: {
      reporte: resultado.respuesta,
      periodo,
      fechaDesde,
      fechaHasta,
      estadisticas: {
        depositosCreados: context.depositosCreados,
        valorDepositadoPeriodo: context.valorDepositadoPeriodo,
        alertasGeneradas: context.alertasGeneradas
      },
      metadata: {
        proveedor: proveedorSeleccionado,
        modelo: resultado.modelo,
        tokensUsados: resultado.tokensUsados,
        costoEstimado,
        tiempoRespuesta
      }
    }
  });
});

// ==================== INSIGHTS IA ====================

/**
 * @desc    Obtener insights generados
 * @route   GET /api/ia/insights
 * @access  Private
 */
exports.getInsights = asyncHandler(async (req, res) => {
  const { tipo, estado, prioridad, page = 1, limit = 20 } = req.query;

  const query = {};

  if (tipo) query.tipo = tipo;
  if (estado) query.estado = estado;
  if (prioridad) query.prioridad = prioridad;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [insights, total] = await Promise.all([
    AI_Insight.find(query)
      .populate('depositosRelacionados', 'numeroDeposito valorTotal')
      .populate('emplazamientosRelacionados', 'nombre ciudad')
      .sort({ estado: 1, prioridad: -1, fechaGeneracion: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    AI_Insight.countDocuments(query)
  ]);

  res.status(200).json({
    success: true,
    data: {
      insights,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
});

/**
 * @desc    Obtener insight por ID
 * @route   GET /api/ia/insights/:id
 * @access  Private
 */
exports.getInsightById = asyncHandler(async (req, res) => {
  const insight = await AI_Insight.findById(req.params.id)
    .populate('depositosRelacionados', 'numeroDeposito valorTotal cliente')
    .populate('emplazamientosRelacionados', 'nombre ciudad cliente')
    .populate('vistoPor', 'name email');

  if (!insight) {
    throw new NotFoundError('Insight');
  }

  res.status(200).json({
    success: true,
    data: { insight }
  });
});

/**
 * @desc    Generar insights automáticamente
 * @route   POST /api/ia/insights/generar
 * @access  Private (Admin)
 */
exports.generarInsights = asyncHandler(async (req, res) => {
  const { proveedor } = req.body;

  // Obtener configuración activa
  const proveedorSeleccionado = proveedor || 'anthropic';
  const config = await AI_Config.getActiveConfig(proveedorSeleccionado);

  if (!config) {
    throw new AppError(`No hay configuración activa para ${proveedorSeleccionado}`, 400);
  }

  // Obtener datos del sistema
  const [depositos, alertas, emplazamientos, estadisticas] = await Promise.all([
    Deposito.find({ activo: true }).populate('producto cliente emplazamiento'),
    Alerta.find({ resuelta: false }),
    Emplazamiento.find({ estado: 'activo' }),
    obtenerEstadisticasGenerales()
  ]);

  const context = {
    totalDepositos: depositos.length,
    valorTotal: depositos.reduce((sum, d) => sum + d.valorTotal, 0),
    alertasPendientes: alertas.length,
    alertasCriticas: alertas.filter(a => a.prioridad === 'critica').length,
    depositosProximosVencer: depositos.filter(d => {
      if (!d.fechaVencimiento) return false;
      const dias = d.getDiasHastaVencimiento();
      return dias >= 0 && dias <= 30;
    }).length,
    estadisticas
  };

  const prompt = `Analiza el estado actual del sistema AssetFlow y genera entre 3 y 5 insights accionables.

Para cada insight, proporciona:
- Tipo: alerta, oportunidad, riesgo o recomendacion
- Título: breve y descriptivo
- Descripción: detallada y clara
- Prioridad: baja, media, alta o critica
- Confianza: valor entre 0 y 1
- Acciones sugeridas: lista de acciones concretas

Formato de respuesta JSON:
{
  "insights": [
    {
      "tipo": "alerta|oportunidad|riesgo|recomendacion",
      "titulo": "string",
      "descripcion": "string",
      "prioridad": "baja|media|alta|critica",
      "confianza": 0.0-1.0,
      "accionesSugeridas": [
        {
          "accion": "string",
          "razonamiento": "string",
          "impactoEstimado": "string",
          "prioridad": 1-5
        }
      ]
    }
  ]
}`;

  // Desencriptar API key
  const apiKey = config.getApiKey();
  const configWithKey = { ...config.toObject(), apiKey };

  let resultado;

  try {
    if (proveedorSeleccionado === 'openai') {
      resultado = await analyzeWithOpenAI(configWithKey, prompt, context, { responseFormat: 'json' });
    } else {
      resultado = await analyzeWithAnthropic(configWithKey, prompt, context);
    }
  } catch (error) {
    logger.error('Error en generación de insights', { error: error.message });
    throw error;
  }

  // Parsear respuesta JSON
  let insightsData;
  try {
    insightsData = JSON.parse(resultado.respuesta);
  } catch (parseError) {
    logger.error('Error al parsear insights JSON', { error: parseError.message });
    throw new AppError('Error al procesar insights generados', 500);
  }

  // Guardar insights en BD
  const insightsCreados = [];

  if (insightsData.insights && Array.isArray(insightsData.insights)) {
    for (const insightData of insightsData.insights) {
      const insight = await AI_Insight.create({
        tipo: insightData.tipo,
        titulo: insightData.titulo,
        descripcion: insightData.descripcion,
        prioridad: insightData.prioridad,
        confianza: insightData.confianza,
        accionesSugeridas: insightData.accionesSugeridas || [],
        generadoPor: proveedorSeleccionado,
        modeloUtilizado: resultado.modelo,
        datosBase: context,
        validezHasta: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días
      });

      insightsCreados.push(insight);
    }
  }

  // Guardar consulta
  await AI_Consulta.create({
    tipoConsulta: 'analisis',
    proveedor: proveedorSeleccionado,
    modelo: resultado.modelo,
    prompt,
    contexto: context,
    usuario: req.user.id,
    respuesta: resultado.respuesta,
    respuestaJSON: insightsData,
    tokensUsados: resultado.tokensUsados,
    costoEstimado: (resultado.tokensUsados / 1000) * config.costoPor1000Tokens,
    tiempoRespuesta: resultado.tiempoRespuesta,
    tags: ['insights', 'automatico'],
    fechaConsulta: new Date()
  });

  // Incrementar uso mensual
  await AI_Config.incrementarUso(config._id, resultado.tokensUsados);

  logger.info('Insights generados automáticamente', {
    cantidad: insightsCreados.length,
    proveedor: proveedorSeleccionado,
    userId: req.user.id
  });

  res.status(201).json({
    success: true,
    message: `${insightsCreados.length} insights generados exitosamente`,
    data: {
      insights: insightsCreados,
      metadata: {
        proveedor: proveedorSeleccionado,
        modelo: resultado.modelo,
        tokensUsados: resultado.tokensUsados
      }
    }
  });
});

/**
 * @desc    Resolver insight
 * @route   POST /api/ia/insights/:id/resolver
 * @access  Private
 */
exports.resolverInsight = asyncHandler(async (req, res) => {
  const insight = await AI_Insight.findById(req.params.id);

  if (!insight) {
    throw new NotFoundError('Insight');
  }

  const { accionesTomadas, resultado } = req.body;

  insight.estado = 'resuelto';
  insight.accionesTomadas = accionesTomadas || [];
  insight.resultado = resultado || '';

  await insight.save();

  logger.info('Insight resuelto', {
    insightId: insight._id,
    titulo: insight.titulo,
    userId: req.user.id
  });

  res.status(200).json({
    success: true,
    message: 'Insight marcado como resuelto',
    data: { insight }
  });
});

/**
 * @desc    Descartar insight
 * @route   POST /api/ia/insights/:id/descartar
 * @access  Private
 */
exports.descartarInsight = asyncHandler(async (req, res) => {
  const insight = await AI_Insight.findById(req.params.id);

  if (!insight) {
    throw new NotFoundError('Insight');
  }

  insight.estado = 'descartado';

  await insight.save();

  logger.info('Insight descartado', {
    insightId: insight._id,
    titulo: insight.titulo,
    userId: req.user.id
  });

  res.status(200).json({
    success: true,
    message: 'Insight descartado',
    data: { insight }
  });
});

/**
 * @desc    Marcar insight como visto
 * @route   POST /api/ia/insights/:id/visto
 * @access  Private
 */
exports.marcarVisto = asyncHandler(async (req, res) => {
  const insight = await AI_Insight.findById(req.params.id);

  if (!insight) {
    throw new NotFoundError('Insight');
  }

  if (!insight.vistoPor.includes(req.user.id)) {
    insight.vistoPor.push(req.user.id);
  }

  if (insight.estado === 'nuevo') {
    insight.estado = 'visto';
  }

  await insight.save();

  res.status(200).json({
    success: true,
    message: 'Insight marcado como visto',
    data: { insight }
  });
});

// ==================== HISTORIAL ====================

/**
 * @desc    Obtener historial de consultas
 * @route   GET /api/ia/historial
 * @access  Private
 */
exports.getHistorial = asyncHandler(async (req, res) => {
  const { tipoConsulta, guardado, page = 1, limit = 20 } = req.query;

  const query = { usuario: req.user.id };

  if (tipoConsulta) query.tipoConsulta = tipoConsulta;
  if (guardado !== undefined) query.guardado = guardado === 'true';

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [consultas, total] = await Promise.all([
    AI_Consulta.find(query)
      .sort({ fechaConsulta: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    AI_Consulta.countDocuments(query)
  ]);

  res.status(200).json({
    success: true,
    data: {
      consultas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
});

/**
 * @desc    Guardar consulta
 * @route   POST /api/ia/historial/:id/guardar
 * @access  Private
 */
exports.guardarConsulta = asyncHandler(async (req, res) => {
  const consulta = await AI_Consulta.findOne({
    _id: req.params.id,
    usuario: req.user.id
  });

  if (!consulta) {
    throw new NotFoundError('Consulta');
  }

  consulta.guardado = true;
  await consulta.save();

  res.status(200).json({
    success: true,
    message: 'Consulta guardada',
    data: { consulta }
  });
});

/**
 * @desc    Valorar consulta
 * @route   POST /api/ia/historial/:id/valorar
 * @access  Private
 */
exports.valorarConsulta = asyncHandler(async (req, res) => {
  const consulta = await AI_Consulta.findOne({
    _id: req.params.id,
    usuario: req.user.id
  });

  if (!consulta) {
    throw new NotFoundError('Consulta');
  }

  const { utilidad, feedback } = req.body;

  if (utilidad < 1 || utilidad > 5) {
    throw new ValidationError('La utilidad debe estar entre 1 y 5');
  }

  consulta.utilidad = utilidad;
  if (feedback) {
    consulta.feedback = feedback;
  }

  await consulta.save();

  res.status(200).json({
    success: true,
    message: 'Valoración guardada',
    data: { consulta }
  });
});

// ==================== FUNCIONES AUXILIARES ====================

/**
 * Obtiene el contexto general del sistema para análisis IA
 */
async function obtenerContextoSistema() {
  const [totalDepositos, valorTotal, alertasPendientes, emplazamientosActivos] = await Promise.all([
    Deposito.countDocuments({ activo: true }),
    Deposito.aggregate([
      { $match: { activo: true } },
      { $group: { _id: null, total: { $sum: '$valorTotal' } } }
    ]),
    Alerta.countDocuments({ resuelta: false }),
    Emplazamiento.countDocuments({ estado: 'activo' })
  ]);

  return {
    totalDepositos,
    valorTotalDepositado: valorTotal[0]?.total || 0,
    alertasPendientes,
    emplazamientosActivos,
    fecha: new Date().toISOString()
  };
}

/**
 * Obtiene estadísticas generales del sistema
 */
async function obtenerEstadisticasGenerales() {
  const [depositosStats, alertasStats, clientesStats] = await Promise.all([
    Deposito.aggregate([
      { $match: { activo: true } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          valorTotal: { $sum: '$valorTotal' },
          cantidadTotal: { $sum: '$cantidad' }
        }
      }
    ]),
    Alerta.aggregate([
      {
        $group: {
          _id: '$prioridad',
          count: { $sum: 1 }
        }
      }
    ]),
    Cliente.countDocuments({ activo: true })
  ]);

  return {
    depositos: depositosStats[0] || { total: 0, valorTotal: 0, cantidadTotal: 0 },
    alertas: alertasStats,
    clientesActivos: clientesStats
  };
}

/**
 * Agrupa elementos por campo
 */
function agruparPor(array, campo) {
  const grupos = {};

  for (const item of array) {
    const key = item[campo]?._id?.toString() || 'sin_asignar';
    if (!grupos[key]) {
      grupos[key] = {
        nombre: item[campo]?.nombre || 'Sin asignar',
        items: [],
        valorTotal: 0
      };
    }
    grupos[key].items.push(item);
    grupos[key].valorTotal += item.valorTotal || 0;
  }

  return Object.values(grupos);
}

/**
 * Agrupa depósitos por ciudad
 */
function agruparPorCiudad(depositos) {
  const ciudades = {};

  for (const deposito of depositos) {
    const ciudad = deposito.emplazamiento?.ciudad || 'Sin especificar';
    if (!ciudades[ciudad]) {
      ciudades[ciudad] = {
        cantidad: 0,
        valorTotal: 0
      };
    }
    ciudades[ciudad].cantidad++;
    ciudades[ciudad].valorTotal += deposito.valorTotal;
  }

  return ciudades;
}
