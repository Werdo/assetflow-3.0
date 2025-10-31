const express = require('express');
const router = express.Router();
const {
  getDepositos,
  getDeposito,
  createDeposito,
  updateDeposito,
  deleteDeposito,
  extenderPlazo,
  marcarFacturado,
  marcarRetirado,
  getProximosVencer,
  getVencidos,
  getEstadisticas,
  buscarPorCodigoUnitario,
  agregarCodigosUnitarios,
  importarCodigosCSV
} = require('../controllers/depositoController');
const { protect, isAdminOrManager, isAdmin } = require('../middleware/auth');
const { validateDeposito, validateMongoId } = require('../middleware/validate');

// Todas las rutas requieren autenticación
router.use(protect);

/**
 * @route   GET /api/depositos
 * @desc    Obtener todos los depósitos con filtros y paginación
 * @access  Private
 */
router.get('/', getDepositos);

/**
 * @route   GET /api/depositos/proximos-vencer
 * @desc    Obtener depósitos próximos a vencer
 * @access  Private
 */
router.get('/proximos-vencer', getProximosVencer);

/**
 * @route   GET /api/depositos/vencidos
 * @desc    Obtener depósitos vencidos
 * @access  Private
 */
router.get('/vencidos', getVencidos);

/**
 * @route   GET /api/depositos/estadisticas
 * @desc    Obtener estadísticas de depósitos
 * @access  Private
 */
router.get('/estadisticas', getEstadisticas);

/**
 * @route   GET /api/depositos/buscar-codigo/:codigo
 * @desc    Buscar depósito por código unitario
 * @access  Private
 */
router.get('/buscar-codigo/:codigo', buscarPorCodigoUnitario);

/**
 * @route   GET /api/depositos/:id
 * @desc    Obtener depósito por ID con movimientos y alertas
 * @access  Private
 */
router.get('/:id', validateMongoId('id'), getDeposito);

/**
 * @route   POST /api/depositos
 * @desc    Crear nuevo depósito
 * @access  Private (Admin/Manager)
 */
router.post('/', isAdminOrManager, validateDeposito, createDeposito);

/**
 * @route   PUT /api/depositos/:id
 * @desc    Actualizar depósito
 * @access  Private (Admin/Manager)
 */
router.put('/:id', isAdminOrManager, validateMongoId('id'), updateDeposito);

/**
 * @route   PUT /api/depositos/:id/extender-plazo
 * @desc    Extender plazo de vencimiento del depósito
 * @access  Private (Admin/Manager)
 */
router.put('/:id/extender-plazo', isAdminOrManager, validateMongoId('id'), extenderPlazo);

/**
 * @route   PUT /api/depositos/:id/facturar
 * @desc    Marcar depósito como facturado
 * @access  Private (Admin/Manager)
 */
router.put('/:id/facturar', isAdminOrManager, validateMongoId('id'), marcarFacturado);

/**
 * @route   PUT /api/depositos/:id/retirar
 * @desc    Marcar depósito como retirado/devuelto
 * @access  Private (Admin/Manager)
 */
router.put('/:id/retirar', isAdminOrManager, validateMongoId('id'), marcarRetirado);

/**
 * @route   POST /api/depositos/:id/codigos
 * @desc    Añadir códigos unitarios a un depósito
 * @access  Private (Admin/Manager)
 */
router.post('/:id/codigos', isAdminOrManager, validateMongoId('id'), agregarCodigosUnitarios);

/**
 * @route   POST /api/depositos/:id/importar-codigos
 * @desc    Importar códigos unitarios desde CSV
 * @access  Private (Admin/Manager)
 */
router.post('/:id/importar-codigos', isAdminOrManager, validateMongoId('id'), importarCodigosCSV);

/**
 * @route   DELETE /api/depositos/:id
 * @desc    Eliminar depósito (soft delete)
 * @access  Private (Admin)
 */
router.delete('/:id', isAdmin, validateMongoId('id'), deleteDeposito);

module.exports = router;
