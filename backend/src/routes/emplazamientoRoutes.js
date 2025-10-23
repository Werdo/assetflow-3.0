const express = require('express');
const router = express.Router();
const {
  getEmplazamientos,
  getEmplazamiento,
  createEmplazamiento,
  updateEmplazamiento,
  deleteEmplazamiento,
  getEmplazamientosCercanos,
  getEmplazamientosParaMapa
} = require('../controllers/emplazamientoController');
const { protect, isAdminOrManager, isAdmin } = require('../middleware/auth');
const { validateEmplazamiento, validateMongoId } = require('../middleware/validate');

// Todas las rutas requieren autenticación
router.use(protect);

/**
 * @route   GET /api/emplazamientos
 * @desc    Obtener todos los emplazamientos con filtros y paginación
 * @access  Private
 */
router.get('/', getEmplazamientos);

/**
 * @route   GET /api/emplazamientos/mapa/todos
 * @desc    Obtener todos los emplazamientos para mapa con estadísticas
 * @access  Private
 */
router.get('/mapa/todos', getEmplazamientosParaMapa);

/**
 * @route   GET /api/emplazamientos/cercanos/:lng/:lat
 * @desc    Obtener emplazamientos cercanos a coordenadas
 * @access  Private
 */
router.get('/cercanos/:lng/:lat', getEmplazamientosCercanos);

/**
 * @route   GET /api/emplazamientos/:id
 * @desc    Obtener emplazamiento por ID con estadísticas
 * @access  Private
 */
router.get('/:id', validateMongoId('id'), getEmplazamiento);

/**
 * @route   POST /api/emplazamientos
 * @desc    Crear nuevo emplazamiento
 * @access  Private (Admin/Manager)
 */
router.post('/', isAdminOrManager, validateEmplazamiento, createEmplazamiento);

/**
 * @route   PUT /api/emplazamientos/:id
 * @desc    Actualizar emplazamiento
 * @access  Private (Admin/Manager)
 */
router.put('/:id', isAdminOrManager, validateMongoId('id'), updateEmplazamiento);

/**
 * @route   DELETE /api/emplazamientos/:id
 * @desc    Eliminar emplazamiento (soft delete)
 * @access  Private (Admin)
 */
router.delete('/:id', isAdmin, validateMongoId('id'), deleteEmplazamiento);

module.exports = router;
