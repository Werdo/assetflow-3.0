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
  const { activo, search, esSubcliente, clientePrincipal, page = 1, limit = 20 } = req.query;

  const query = {};

  if (activo !== undefined) {
    query.activo = activo === 'true';
  }

  if (esSubcliente !== undefined) {
    query.esSubcliente = esSubcliente === 'true';
  }

  if (clientePrincipal) {
    query.clientePrincipal = clientePrincipal;
  }

  if (search) {
    query.$or = [
      { nombre: { $regex: search, $options: 'i' } },
      { cif: { $regex: search, $options: 'i' } },
      { codigo: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [clientes, total] = await Promise.all([
    Cliente.find(query)
      .populate('clientePrincipal', 'codigo nombre')
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
  const cliente = await Cliente.findById(req.params.id)
    .populate('clientePrincipal', 'codigo nombre');

  if (!cliente) {
    throw new NotFoundError('Cliente');
  }

  // Obtener estadísticas del cliente
  const estadisticas = await cliente.getEstadisticas();

  // Si es cliente principal, obtener sus subclientes
  let subclientes = [];
  if (!cliente.esSubcliente) {
    subclientes = await Cliente.find({ clientePrincipal: cliente._id })
      .select('codigo nombre cif activo')
      .sort({ nombre: 1 });
  }

  res.status(200).json({
    success: true,
    data: {
      cliente: cliente.toPublicJSON(),
      estadisticas,
      subclientes: subclientes.map(s => s.toPublicJSON())
    }
  });
});

/**
 * @desc    Crear nuevo cliente
 * @route   POST /api/clientes
 * @access  Private (Admin/Manager)
 */
exports.createCliente = asyncHandler(async (req, res) => {
  const { nombre, cif, direccion, contacto, notas, esSubcliente, clientePrincipal } = req.body;

  // Verificar CIF único si se proporciona
  if (cif) {
    const existente = await Cliente.findOne({ cif: cif.toUpperCase() });
    if (existente) {
      throw new ValidationError('El CIF ya existe');
    }
  }

  // Validar que si es subcliente, tenga clientePrincipal
  if (esSubcliente && !clientePrincipal) {
    throw new ValidationError('Un subcliente debe tener un cliente principal asignado');
  }

  // Validar que el clientePrincipal existe y no es subcliente
  if (clientePrincipal) {
    const principal = await Cliente.findById(clientePrincipal);
    if (!principal) {
      throw new NotFoundError('El cliente principal especificado no existe');
    }
    if (principal.esSubcliente) {
      throw new ValidationError('El cliente principal no puede ser un subcliente');
    }
  }

  const cliente = await Cliente.create({
    nombre,
    cif: cif ? cif.toUpperCase() : undefined,
    direccion,
    contacto,
    notas,
    esSubcliente: esSubcliente || false,
    clientePrincipal: esSubcliente ? clientePrincipal : null
  });

  logger.info('Cliente creado', {
    clienteId: cliente._id,
    nombre: cliente.nombre,
    esSubcliente: cliente.esSubcliente,
    userId: req.user.id
  });

  res.status(201).json({
    success: true,
    message: `${esSubcliente ? 'Subcliente' : 'Cliente'} creado exitosamente`,
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

  const { nombre, cif, direccion, contacto, notas, activo, esSubcliente, clientePrincipal } = req.body;

  // Si cambia el CIF, verificar que no exista
  if (cif && cif.toUpperCase() !== cliente.cif) {
    const existente = await Cliente.findOne({ cif: cif.toUpperCase() });
    if (existente) {
      throw new ValidationError('El CIF ya existe');
    }
    cliente.cif = cif.toUpperCase();
  }

  // Validar cambios en esSubcliente y clientePrincipal
  if (esSubcliente !== undefined) {
    // Si se intenta convertir en subcliente, debe tener clientePrincipal
    if (esSubcliente && !clientePrincipal && !cliente.clientePrincipal) {
      throw new ValidationError('Un subcliente debe tener un cliente principal asignado');
    }

    // Si se intenta convertir en cliente principal, verificar que no tenga subclientes
    if (!esSubcliente && cliente.esSubcliente) {
      const tieneSubclientes = await Cliente.exists({ clientePrincipal: cliente._id });
      if (tieneSubclientes) {
        throw new ValidationError('No se puede convertir a cliente principal porque este subcliente ya tiene subclientes asignados');
      }
    }

    cliente.esSubcliente = esSubcliente;
  }

  // Validar clientePrincipal
  if (clientePrincipal !== undefined) {
    if (clientePrincipal) {
      const principal = await Cliente.findById(clientePrincipal);
      if (!principal) {
        throw new NotFoundError('El cliente principal especificado no existe');
      }
      if (principal.esSubcliente) {
        throw new ValidationError('El cliente principal no puede ser un subcliente');
      }
      if (principal._id.equals(cliente._id)) {
        throw new ValidationError('Un cliente no puede ser su propio cliente principal');
      }
    }
    cliente.clientePrincipal = clientePrincipal || null;
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
    esSubcliente: cliente.esSubcliente,
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

  // Verificar que no tenga subclientes activos
  const subclientesActivos = await Cliente.countDocuments({
    clientePrincipal: cliente._id,
    activo: true
  });

  if (subclientesActivos > 0) {
    throw new ValidationError(`No se puede desactivar el cliente porque tiene ${subclientesActivos} subcliente(s) activo(s)`);
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
    esSubcliente: cliente.esSubcliente,
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
