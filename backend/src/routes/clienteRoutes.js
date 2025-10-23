const express = require('express');
const router = express.Router();
const {
  getClientes,
  getCliente,
  createCliente,
  updateCliente,
  deleteCliente,
  getEstadisticas
} = require('../controllers/clienteController');
const { protect, isAdminOrManager, isAdmin } = require('../middleware/auth');
const { validateCliente, validateMongoId } = require('../middleware/validate');

// Todas las rutas requieren autenticación
router.use(protect);

/**
 * @route   GET /api/clientes
 * @desc    Obtener todos los clientes con filtros y paginación
 * @access  Private
 */
router.get('/', getClientes);

/**
 * @route   GET /api/clientes/:id
 * @desc    Obtener cliente por ID con estadísticas
 * @access  Private
 */
router.get('/:id', validateMongoId('id'), getCliente);

/**
 * @route   GET /api/clientes/:id/estadisticas
 * @desc    Obtener estadísticas del cliente
 * @access  Private
 */
router.get('/:id/estadisticas', validateMongoId('id'), getEstadisticas);

/**
 * @route   POST /api/clientes
 * @desc    Crear nuevo cliente
 * @access  Private (Admin/Manager)
 */
router.post('/', isAdminOrManager, validateCliente, createCliente);

/**
 * @route   PUT /api/clientes/:id
 * @desc    Actualizar cliente
 * @access  Private (Admin/Manager)
 */
router.put('/:id', isAdminOrManager, validateMongoId('id'), updateCliente);

/**
 * @route   DELETE /api/clientes/:id
 * @desc    Eliminar cliente (soft delete)
 * @access  Private (Admin)
 */
router.delete('/:id', isAdmin, validateMongoId('id'), deleteCliente);

module.exports = router;
