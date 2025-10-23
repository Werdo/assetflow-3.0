const express = require('express');
const router = express.Router();
const {
  getProductos,
  getProducto,
  createProducto,
  updateProducto,
  deleteProducto,
  getCategorias
} = require('../controllers/productoController');
const { protect, isAdminOrManager, isAdmin } = require('../middleware/auth');
const { validateProducto, validateMongoId } = require('../middleware/validate');

// Todas las rutas requieren autenticación
router.use(protect);

/**
 * @route   GET /api/productos
 * @desc    Obtener todos los productos con filtros y paginación
 * @access  Private
 */
router.get('/', getProductos);

/**
 * @route   GET /api/productos/categorias/list
 * @desc    Obtener lista de categorías de productos
 * @access  Private
 */
router.get('/categorias/list', getCategorias);

/**
 * @route   GET /api/productos/:id
 * @desc    Obtener producto por ID con stock total
 * @access  Private
 */
router.get('/:id', validateMongoId('id'), getProducto);

/**
 * @route   POST /api/productos
 * @desc    Crear nuevo producto
 * @access  Private (Admin/Manager)
 */
router.post('/', isAdminOrManager, validateProducto, createProducto);

/**
 * @route   PUT /api/productos/:id
 * @desc    Actualizar producto
 * @access  Private (Admin/Manager)
 */
router.put('/:id', isAdminOrManager, validateMongoId('id'), updateProducto);

/**
 * @route   DELETE /api/productos/:id
 * @desc    Eliminar producto (soft delete)
 * @access  Private (Admin)
 */
router.delete('/:id', isAdmin, validateMongoId('id'), deleteProducto);

module.exports = router;
