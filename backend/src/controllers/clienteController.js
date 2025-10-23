const Cliente = require('../models/Cliente');
const { asyncHandler } = require('../utils/errorHandler');
const { NotFoundError, ValidationError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * @desc    Obtener todos los clientes
 * @route   GET /api/clientes
 * @access  Private
 */
exports.getClientes = asyncHandler(async (req, res) => {
  const { activo, search, page = 1, limit = 20 } = req.query;

  const query = {};

  if (activo !== undefined) {
    query.activo = activo === 'true';
  }

  if (search) {
    query.$or = [
      { nombre: { $regex: search, $options: 'i' } },
      { cif: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [clientes, total] = await Promise.all([
    Cliente.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Cliente.countDocuments(query)
  ]);

  res.status(200).json({
    success: true,
    data: {
      clientes: clientes.map(c => c.toPublicJSON()),
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
 * @desc    Obtener cliente por ID
 * @route   GET /api/clientes/:id
 * @access  Private
 */
exports.getCliente = asyncHandler(async (req, res) => {
  const cliente = await Cliente.findById(req.params.id);

  if (!cliente) {
    throw new NotFoundError('Cliente');
  }

  // Obtener estadísticas del cliente
  const estadisticas = await cliente.getEstadisticas();

  res.status(200).json({
    success: true,
    data: {
      cliente: cliente.toPublicJSON(),
      estadisticas
    }
  });
});

/**
 * @desc    Crear nuevo cliente
 * @route   POST /api/clientes
 * @access  Private (Admin/Manager)
 */
exports.createCliente = asyncHandler(async (req, res) => {
  const { nombre, cif, direccion, contacto, notas } = req.body;

  // Verificar CIF único si se proporciona
  if (cif) {
    const existente = await Cliente.findOne({ cif: cif.toUpperCase() });
    if (existente) {
      throw new ValidationError('El CIF ya existe');
    }
  }

  const cliente = await Cliente.create({
    nombre,
    cif: cif ? cif.toUpperCase() : undefined,
    direccion,
    contacto,
    notas
  });

  logger.info('Cliente creado', {
    clienteId: cliente._id,
    nombre: cliente.nombre,
    userId: req.user.id
  });

  res.status(201).json({
    success: true,
    message: 'Cliente creado exitosamente',
    data: {
      cliente: cliente.toPublicJSON()
    }
  });
});

/**
 * @desc    Actualizar cliente
 * @route   PUT /api/clientes/:id
 * @access  Private (Admin/Manager)
 */
exports.updateCliente = asyncHandler(async (req, res) => {
  let cliente = await Cliente.findById(req.params.id);

  if (!cliente) {
    throw new NotFoundError('Cliente');
  }

  const { nombre, cif, direccion, contacto, notas, activo } = req.body;

  // Si cambia el CIF, verificar que no exista
  if (cif && cif.toUpperCase() !== cliente.cif) {
    const existente = await Cliente.findOne({ cif: cif.toUpperCase() });
    if (existente) {
      throw new ValidationError('El CIF ya existe');
    }
    cliente.cif = cif.toUpperCase();
  }

  if (nombre) cliente.nombre = nombre;
  if (direccion) cliente.direccion = direccion;
  if (contacto) cliente.contacto = contacto;
  if (notas !== undefined) cliente.notas = notas;
  if (activo !== undefined) cliente.activo = activo;

  await cliente.save();

  logger.info('Cliente actualizado', {
    clienteId: cliente._id,
    nombre: cliente.nombre,
    userId: req.user.id
  });

  res.status(200).json({
    success: true,
    message: 'Cliente actualizado exitosamente',
    data: {
      cliente: cliente.toPublicJSON()
    }
  });
});

/**
 * @desc    Eliminar cliente (soft delete)
 * @route   DELETE /api/clientes/:id
 * @access  Private (Admin)
 */
exports.deleteCliente = asyncHandler(async (req, res) => {
  const cliente = await Cliente.findById(req.params.id);

  if (!cliente) {
    throw new NotFoundError('Cliente');
  }

  // Verificar que no tenga emplazamientos activos
  const Emplazamiento = require('../models/Emplazamiento');
  const emplazamientosActivos = await Emplazamiento.countDocuments({
    cliente: cliente._id,
    activo: true
  });

  if (emplazamientosActivos > 0) {
    throw new ValidationError(`No se puede desactivar el cliente porque tiene ${emplazamientosActivos} emplazamiento(s) activo(s)`);
  }

  // Soft delete
  cliente.activo = false;
  await cliente.save();

  logger.warn('Cliente desactivado', {
    clienteId: cliente._id,
    nombre: cliente.nombre,
    userId: req.user.id
  });

  res.status(200).json({
    success: true,
    message: 'Cliente desactivado exitosamente'
  });
});

/**
 * @desc    Obtener estadísticas de cliente
 * @route   GET /api/clientes/:id/estadisticas
 * @access  Private
 */
exports.getEstadisticas = asyncHandler(async (req, res) => {
  const cliente = await Cliente.findById(req.params.id);

  if (!cliente) {
    throw new NotFoundError('Cliente');
  }

  const estadisticas = await cliente.getEstadisticas();

  res.status(200).json({
    success: true,
    data: {
      estadisticas
    }
  });
});
