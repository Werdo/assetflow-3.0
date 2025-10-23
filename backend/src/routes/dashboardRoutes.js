const express = require('express');
const router = express.Router();
const {
  getKPIs,
  getMapaEmplazamientos,
  getAlertasCriticas,
  getEstadisticasPorCliente,
  getEstadisticasPorEmplazamiento,
  getResumenEjecutivo
} = require('../controllers/dashboardController');
const { protect, isAdminOrManager } = require('../middleware/auth');
const { validateMongoId } = require('../middleware/validate');

// Todas las rutas requieren autenticación
router.use(protect);

/**
 * @route   GET /api/dashboard/kpis
 * @desc    Obtener KPIs principales del dashboard
 * @access  Private
 */
router.get('/kpis', getKPIs);

/**
 * @route   GET /api/dashboard/mapa
 * @desc    Obtener datos para mapa de emplazamientos
 * @access  Private
 */
router.get('/mapa', getMapaEmplazamientos);

/**
 * @route   GET /api/dashboard/alertas-criticas
 * @desc    Obtener resumen de alertas críticas
 * @access  Private
 */
router.get('/alertas-criticas', getAlertasCriticas);

/**
 * @route   GET /api/dashboard/resumen-ejecutivo
 * @desc    Obtener resumen ejecutivo
 * @access  Private (Admin/Manager)
 */
router.get('/resumen-ejecutivo', isAdminOrManager, getResumenEjecutivo);

/**
 * @route   GET /api/dashboard/por-cliente/:clienteId
 * @desc    Obtener estadísticas por cliente
 * @access  Private
 */
router.get('/por-cliente/:clienteId', validateMongoId('clienteId'), getEstadisticasPorCliente);

/**
 * @route   GET /api/dashboard/por-emplazamiento/:emplazamientoId
 * @desc    Obtener estadísticas por emplazamiento
 * @access  Private
 */
router.get('/por-emplazamiento/:emplazamientoId', validateMongoId('emplazamientoId'), getEstadisticasPorEmplazamiento);

module.exports = router;
