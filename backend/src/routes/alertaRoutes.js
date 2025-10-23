const express = require('express');
const router = express.Router();
const {
  getAlertas,
  getAlerta,
  createAlerta,
  resolverAlerta,
  deleteAlerta,
  getAlertasActivas,
  getAlertasCriticas,
  getAlertasPorPrioridad,
  getEstadisticas,
  generarAlertasAutomaticas,
  resolverMultiples
} = require('../controllers/alertaController');
const { protect, isAdminOrManager, isAdmin } = require('../middleware/auth');
const { validateMongoId } = require('../middleware/validate');

// Todas las rutas requieren autenticación
router.use(protect);

/**
 * @route   GET /api/alertas
 * @desc    Obtener todas las alertas con filtros y paginación
 * @access  Private
 */
router.get('/', getAlertas);

/**
 * @route   GET /api/alertas/activas/list
 * @desc    Obtener alertas activas (no resueltas)
 * @access  Private
 */
router.get('/activas/list', getAlertasActivas);

/**
 * @route   GET /api/alertas/criticas/list
 * @desc    Obtener alertas críticas (prioridad alta)
 * @access  Private
 */
router.get('/criticas/list', getAlertasCriticas);

/**
 * @route   GET /api/alertas/estadisticas/general
 * @desc    Obtener estadísticas de alertas
 * @access  Private
 */
router.get('/estadisticas/general', getEstadisticas);

/**
 * @route   GET /api/alertas/prioridad/:prioridad
 * @desc    Obtener alertas por prioridad
 * @access  Private
 */
router.get('/prioridad/:prioridad', getAlertasPorPrioridad);

/**
 * @route   GET /api/alertas/:id
 * @desc    Obtener alerta por ID
 * @access  Private
 */
router.get('/:id', validateMongoId('id'), getAlerta);

/**
 * @route   POST /api/alertas
 * @desc    Crear nueva alerta manual
 * @access  Private (Admin/Manager)
 */
router.post('/', isAdminOrManager, createAlerta);

/**
 * @route   POST /api/alertas/generar-automaticas
 * @desc    Generar alertas automáticas para todos los depósitos
 * @access  Private (Admin)
 */
router.post('/generar-automaticas', isAdmin, generarAlertasAutomaticas);

/**
 * @route   PUT /api/alertas/:id/resolver
 * @desc    Marcar alerta como resuelta
 * @access  Private (Admin/Manager)
 */
router.put('/:id/resolver', isAdminOrManager, validateMongoId('id'), resolverAlerta);

/**
 * @route   PUT /api/alertas/resolver-multiples
 * @desc    Resolver múltiples alertas
 * @access  Private (Admin/Manager)
 */
router.put('/resolver-multiples', isAdminOrManager, resolverMultiples);

/**
 * @route   DELETE /api/alertas/:id
 * @desc    Eliminar alerta
 * @access  Private (Admin)
 */
router.delete('/:id', isAdmin, validateMongoId('id'), deleteAlerta);

module.exports = router;
