const Producto = require('../models/Producto');
const { asyncHandler } = require('../utils/errorHandler');
const { NotFoundError, ValidationError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * @desc    Obtener todos los productos
 * @route   GET /api/productos
 * @access  Private
 */
exports.getProductos = asyncHandler(async (req, res) => {
  const { activo, categoria, search, page = 1, limit = 20 } = req.query;

  const query = {};

  // Filtros
  if (activo !== undefined) {
    query.activo = activo === 'true';
  }

  if (categoria) {
    query.categoria = categoria;
  }

  if (search) {
    query.$or = [
      { codigo: { $regex: search, $options: 'i' } },
      { nombre: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [productos, total] = await Promise.all([
    Producto.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Producto.countDocuments(query)
  ]);

  res.status(200).json({
    success: true,
    data: {
      productos: productos.map(p => p.toPublicJSON()),
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
 * @desc    Obtener producto por ID
 * @route   GET /api/productos/:id
 * @access  Private
 */
exports.getProducto = asyncHandler(async (req, res) => {
  const producto = await Producto.findById(req.params.id);

  if (!producto) {
    throw new NotFoundError('Producto');
  }

  // Obtener stock total
  const stockInfo = await producto.getStockTotal();

  res.status(200).json({
    success: true,
    data: {
      producto: producto.toPublicJSON(),
      stock: stockInfo
    }
  });
});

/**
 * @desc    Crear nuevo producto
 * @route   POST /api/productos
 * @access  Private (Admin/Manager)
 */
exports.createProducto = asyncHandler(async (req, res) => {
  const { codigo, nombre, descripcion, categoria, precioUnitario, unidadMedida, stockEnNuestroAlmacen } = req.body;

  // Verificar código único
  const existente = await Producto.findOne({ codigo: codigo.toUpperCase() });
  if (existente) {
    throw new ValidationError('El código de producto ya existe');
  }

  const producto = await Producto.create({
    codigo: codigo.toUpperCase(),
    nombre,
    descripcion,
    categoria,
    precioUnitario,
    unidadMedida,
    stockEnNuestroAlmacen
  });

  logger.info('Producto creado', {
    productoId: producto._id,
    codigo: producto.codigo,
    userId: req.user.id
  });

  res.status(201).json({
    success: true,
    message: 'Producto creado exitosamente',
    data: {
      producto: producto.toPublicJSON()
    }
  });
});

/**
 * @desc    Actualizar producto
 * @route   PUT /api/productos/:id
 * @access  Private (Admin/Manager)
 */
exports.updateProducto = asyncHandler(async (req, res) => {
  let producto = await Producto.findById(req.params.id);

  if (!producto) {
    throw new NotFoundError('Producto');
  }

  const { codigo, nombre, descripcion, categoria, precioUnitario, unidadMedida, stockEnNuestroAlmacen, activo } = req.body;

  // Si cambia el código, verificar que no exista
  if (codigo && codigo.toUpperCase() !== producto.codigo) {
    const existente = await Producto.findOne({ codigo: codigo.toUpperCase() });
    if (existente) {
      throw new ValidationError('El código de producto ya existe');
    }
    producto.codigo = codigo.toUpperCase();
  }

  if (nombre) producto.nombre = nombre;
  if (descripcion !== undefined) producto.descripcion = descripcion;
  if (categoria !== undefined) producto.categoria = categoria;
  if (precioUnitario !== undefined) producto.precioUnitario = precioUnitario;
  if (unidadMedida !== undefined) producto.unidadMedida = unidadMedida;
  if (stockEnNuestroAlmacen !== undefined) producto.stockEnNuestroAlmacen = stockEnNuestroAlmacen;
  if (activo !== undefined) producto.activo = activo;

  await producto.save();

  logger.info('Producto actualizado', {
    productoId: producto._id,
    codigo: producto.codigo,
    userId: req.user.id
  });

  res.status(200).json({
    success: true,
    message: 'Producto actualizado exitosamente',
    data: {
      producto: producto.toPublicJSON()
    }
  });
});

/**
 * @desc    Eliminar producto (soft delete)
 * @route   DELETE /api/productos/:id
 * @access  Private (Admin)
 */
exports.deleteProducto = asyncHandler(async (req, res) => {
  const producto = await Producto.findById(req.params.id);

  if (!producto) {
    throw new NotFoundError('Producto');
  }

  // Soft delete
  producto.activo = false;
  await producto.save();

  logger.warn('Producto desactivado', {
    productoId: producto._id,
    codigo: producto.codigo,
    userId: req.user.id
  });

  res.status(200).json({
    success: true,
    message: 'Producto desactivado exitosamente'
  });
});

/**
 * @desc    Obtener categorías de productos
 * @route   GET /api/productos/categorias/list
 * @access  Private
 */
exports.getCategorias = asyncHandler(async (req, res) => {
  const categorias = await Producto.distinct('categoria', { activo: true });

  res.status(200).json({
    success: true,
    data: {
      categorias: categorias.filter(c => c && c.length > 0)
    }
  });
});
