/**
 * AssetFlow 3.0 - IA Routes
 * Rutas para el módulo de Inteligencia Artificial
 */

const express = require('express');
const router = express.Router();
const {
  // Config
  getConfigs,
  getConfigById,
  createConfig,
  updateConfig,
  deleteConfig,
  // Chat
  chat,
  // Análisis
  analizarVencimientos,
  optimizarDepositos,
  generarReporte,
  // Insights
  getInsights,
  getInsightById,
  generarInsights,
  resolverInsight,
  descartarInsight,
  marcarVisto,
  // Historial
  getHistorial,
  guardarConsulta,
  valorarConsulta
} = require('../controllers/iaController');
const { protect, isAdmin } = require('../middleware/auth');
const { validateMongoId } = require('../middleware/validate');

// Todas las rutas requieren autenticación
router.use(protect);

// ==================== CONFIGURACIÓN IA ====================
// Solo administradores pueden gestionar configuraciones

/**
 * @route   GET /api/ia/config
 * @desc    Obtener todas las configuraciones de IA
 * @access  Private (Admin)
 */
router.get('/config', isAdmin, getConfigs);

/**
 * @route   GET /api/ia/config/:id
 * @desc    Obtener configuración de IA por ID
 * @access  Private (Admin)
 */
router.get('/config/:id', isAdmin, validateMongoId('id'), getConfigById);

/**
 * @route   POST /api/ia/config
 * @desc    Crear nueva configuración de IA
 * @access  Private (Admin)
 */
router.post('/config', isAdmin, createConfig);

/**
 * @route   PUT /api/ia/config/:id
 * @desc    Actualizar configuración de IA
 * @access  Private (Admin)
 */
router.put('/config/:id', isAdmin, validateMongoId('id'), updateConfig);

/**
 * @route   DELETE /api/ia/config/:id
 * @desc    Eliminar configuración de IA
 * @access  Private (Admin)
 */
router.delete('/config/:id', isAdmin, validateMongoId('id'), deleteConfig);

// ==================== CHAT IA ====================

/**
 * @route   POST /api/ia/chat
 * @desc    Chat conversacional con IA
 * @access  Private
 */
router.post('/chat', chat);

// ==================== ANÁLISIS IA ====================

/**
 * @route   POST /api/ia/analizar/vencimientos
 * @desc    Analizar depósitos próximos a vencer con IA
 * @access  Private
 */
router.post('/analizar/vencimientos', analizarVencimientos);

/**
 * @route   POST /api/ia/optimizar/depositos
 * @desc    Generar recomendaciones de optimización de depósitos
 * @access  Private
 */
router.post('/optimizar/depositos', optimizarDepositos);

/**
 * @route   POST /api/ia/generar-reporte/:periodo
 * @desc    Generar reporte ejecutivo (semanal, mensual, trimestral)
 * @access  Private
 * @params  periodo - semanal | mensual | trimestral
 */
router.post('/generar-reporte/:periodo', generarReporte);

// ==================== INSIGHTS IA ====================

/**
 * @route   GET /api/ia/insights
 * @desc    Obtener todos los insights generados
 * @access  Private
 */
router.get('/insights', getInsights);

/**
 * @route   GET /api/ia/insights/:id
 * @desc    Obtener insight por ID
 * @access  Private
 */
router.get('/insights/:id', validateMongoId('id'), getInsightById);

/**
 * @route   POST /api/ia/insights/generar
 * @desc    Generar insights automáticamente
 * @access  Private (Admin)
 */
router.post('/insights/generar', isAdmin, generarInsights);

/**
 * @route   POST /api/ia/insights/:id/resolver
 * @desc    Marcar insight como resuelto
 * @access  Private
 */
router.post('/insights/:id/resolver', validateMongoId('id'), resolverInsight);

/**
 * @route   POST /api/ia/insights/:id/descartar
 * @desc    Descartar insight
 * @access  Private
 */
router.post('/insights/:id/descartar', validateMongoId('id'), descartarInsight);

/**
 * @route   POST /api/ia/insights/:id/visto
 * @desc    Marcar insight como visto
 * @access  Private
 */
router.post('/insights/:id/visto', validateMongoId('id'), marcarVisto);

// ==================== HISTORIAL ====================

/**
 * @route   GET /api/ia/historial
 * @desc    Obtener historial de consultas del usuario
 * @access  Private
 */
router.get('/historial', getHistorial);

/**
 * @route   POST /api/ia/historial/:id/guardar
 * @desc    Guardar consulta en favoritos
 * @access  Private
 */
router.post('/historial/:id/guardar', validateMongoId('id'), guardarConsulta);

/**
 * @route   POST /api/ia/historial/:id/valorar
 * @desc    Valorar utilidad de consulta (1-5 estrellas)
 * @access  Private
 */
router.post('/historial/:id/valorar', validateMongoId('id'), valorarConsulta);

module.exports = router;
