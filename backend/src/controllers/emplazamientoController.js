const Emplazamiento = require('../models/Emplazamiento');
const Cliente = require('../models/Cliente');
const { asyncHandler } = require('../utils/errorHandler');
const { NotFoundError, ValidationError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * @desc    Obtener todos los emplazamientos
 * @route   GET /api/emplazamientos
 * @access  Private
 */
exports.getEmplazamientos = asyncHandler(async (req, res) => {
  const { cliente, activo, search, page = 1, limit = 20 } = req.query;

  const query = {};

  if (cliente) {
    query.cliente = cliente;
  }

  if (activo !== undefined) {
    query.activo = activo === 'true';
  }

  if (search) {
    query.$or = [
      { nombre: { $regex: search, $options: 'i' } },
      { 'direccion.calle': { $regex: search, $options: 'i' } },
      { 'direccion.ciudad': { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [emplazamientos, total] = await Promise.all([
    Emplazamiento.find(query)
      .populate('cliente', 'nombre cif activo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Emplazamiento.countDocuments(query)
  ]);

  res.status(200).json({
    success: true,
    data: {
      emplazamientos: emplazamientos.map(e => e.toPublicJSON()),
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
 * @desc    Obtener emplazamiento por ID
 * @route   GET /api/emplazamientos/:id
 * @access  Private
 */
exports.getEmplazamiento = asyncHandler(async (req, res) => {
  const emplazamiento = await Emplazamiento.findById(req.params.id)
    .populate('cliente', 'nombre cif direccion contacto');

  if (!emplazamiento) {
    throw new NotFoundError('Emplazamiento');
  }

  // Obtener estadísticas
  const estadisticas = await emplazamiento.getEstadisticas();

  res.status(200).json({
    success: true,
    data: {
      emplazamiento: emplazamiento.toPublicJSON(),
      estadisticas
    }
  });
});

/**
 * @desc    Crear nuevo emplazamiento
 * @route   POST /api/emplazamientos
 * @access  Private (Admin/Manager)
 */
exports.createEmplazamiento = asyncHandler(async (req, res) => {
  const { cliente, nombre, direccion, coordenadas, contacto, observaciones } = req.body;

  // Verificar que el cliente existe y está activo
  const clienteDoc = await Cliente.findById(cliente);
  if (!clienteDoc) {
    throw new ValidationError('Cliente no encontrado');
  }
  if (!clienteDoc.activo) {
    throw new ValidationError('El cliente está inactivo');
  }

  // Validar coordenadas
  if (!coordenadas || !coordenadas.coordinates || coordenadas.coordinates.length !== 2) {
    throw new ValidationError('Las coordenadas son requeridas en formato [longitud, latitud]');
  }

  const [lng, lat] = coordenadas.coordinates;
  if (lng < -180 || lng > 180) {
    throw new ValidationError('Longitud inválida (debe estar entre -180 y 180)');
  }
  if (lat < -90 || lat > 90) {
    throw new ValidationError('Latitud inválida (debe estar entre -90 y 90)');
  }

  const emplazamiento = await Emplazamiento.create({
    cliente,
    nombre,
    direccion,
    coordenadas: {
      type: 'Point',
      coordinates: [lng, lat]
    },
    contacto,
    observaciones
  });

  await emplazamiento.populate('cliente', 'nombre cif');

  logger.info('Emplazamiento creado', {
    emplazamientoId: emplazamiento._id,
    nombre: emplazamiento.nombre,
    cliente: clienteDoc.nombre,
    userId: req.user.id
  });

  res.status(201).json({
    success: true,
    message: 'Emplazamiento creado exitosamente',
    data: {
      emplazamiento: emplazamiento.toPublicJSON()
    }
  });
});

/**
 * @desc    Actualizar emplazamiento
 * @route   PUT /api/emplazamientos/:id
 * @access  Private (Admin/Manager)
 */
exports.updateEmplazamiento = asyncHandler(async (req, res) => {
  let emplazamiento = await Emplazamiento.findById(req.params.id);

  if (!emplazamiento) {
    throw new NotFoundError('Emplazamiento');
  }

  const { cliente, nombre, direccion, coordenadas, contacto, observaciones, activo, estado } = req.body;

  // Si se envía estado en lugar de activo, convertirlo
  let activoValue = activo;
  if (estado !== undefined) {
    activoValue = estado === 'activo';
  }

  // Si cambia el cliente, verificar que existe y está activo
  if (cliente && cliente !== emplazamiento.cliente.toString()) {
    const clienteDoc = await Cliente.findById(cliente);
    if (!clienteDoc) {
      throw new ValidationError('Cliente no encontrado');
    }
    if (!clienteDoc.activo) {
      throw new ValidationError('El cliente está inactivo');
    }
    emplazamiento.cliente = cliente;
  }

  if (nombre) emplazamiento.nombre = nombre;
  if (direccion) emplazamiento.direccion = direccion;

  if (coordenadas && coordenadas.coordinates) {
    const [lng, lat] = coordenadas.coordinates;
    if (lng < -180 || lng > 180) {
      throw new ValidationError('Longitud inválida (debe estar entre -180 y 180)');
    }
    if (lat < -90 || lat > 90) {
      throw new ValidationError('Latitud inválida (debe estar entre -90 y 90)');
    }
    emplazamiento.coordenadas = {
      type: 'Point',
      coordinates: [lng, lat]
    };
  }

  if (contacto) emplazamiento.contacto = contacto;
  if (observaciones !== undefined) emplazamiento.observaciones = observaciones;
  if (activoValue !== undefined) emplazamiento.activo = activoValue;

  await emplazamiento.save();
  await emplazamiento.populate('cliente', 'nombre cif');

  logger.info('Emplazamiento actualizado', {
    emplazamientoId: emplazamiento._id,
    nombre: emplazamiento.nombre,
    userId: req.user.id
  });

  res.status(200).json({
    success: true,
    message: 'Emplazamiento actualizado exitosamente',
    data: {
      emplazamiento: emplazamiento.toPublicJSON()
    }
  });
});

/**
 * @desc    Eliminar emplazamiento (soft delete)
 * @route   DELETE /api/emplazamientos/:id
 * @access  Private (Admin)
 */
exports.deleteEmplazamiento = asyncHandler(async (req, res) => {
  const emplazamiento = await Emplazamiento.findById(req.params.id);

  if (!emplazamiento) {
    throw new NotFoundError('Emplazamiento');
  }

  // Verificar que no tenga depósitos activos
  const Deposito = require('../models/Deposito');
  const depositosActivos = await Deposito.countDocuments({
    emplazamiento: emplazamiento._id,
    activo: true
  });

  if (depositosActivos > 0) {
    throw new ValidationError(`No se puede desactivar el emplazamiento porque tiene ${depositosActivos} depósito(s) activo(s)`);
  }

  // Soft delete
  emplazamiento.activo = false;
  await emplazamiento.save();

  logger.warn('Emplazamiento desactivado', {
    emplazamientoId: emplazamiento._id,
    nombre: emplazamiento.nombre,
    userId: req.user.id
  });

  res.status(200).json({
    success: true,
    message: 'Emplazamiento desactivado exitosamente'
  });
});

/**
 * @desc    Obtener emplazamientos cercanos a una ubicación
 * @route   GET /api/emplazamientos/cercanos/:lng/:lat
 * @access  Private
 */
exports.getEmplazamientosCercanos = asyncHandler(async (req, res) => {
  const { lng, lat } = req.params;
  const { maxDistance = 50 } = req.query; // km

  const longitud = parseFloat(lng);
  const latitud = parseFloat(lat);

  if (isNaN(longitud) || isNaN(latitud)) {
    throw new ValidationError('Coordenadas inválidas');
  }

  const emplazamientos = await Emplazamiento.findCercanos(longitud, latitud, parseFloat(maxDistance));

  res.status(200).json({
    success: true,
    data: {
      emplazamientos: emplazamientos.map(e => ({
        ...e.toPublicJSON(),
        distancia: e.distancia
      }))
    }
  });
});

/**
 * @desc    Obtener todos los emplazamientos para mapa
 * @route   GET /api/emplazamientos/mapa/todos
 * @access  Private
 */
exports.getEmplazamientosParaMapa = asyncHandler(async (req, res) => {
  const emplazamientos = await Emplazamiento.find({ activo: true })
    .populate('cliente', 'nombre')
    .select('nombre cliente coordenadas direccion');

  // Obtener estadísticas para cada emplazamiento
  const emplazamientosConEstadisticas = await Promise.all(
    emplazamientos.map(async (emp) => {
      const estadisticas = await emp.getEstadisticas();
      return {
        _id: emp._id,
        nombre: emp.nombre,
        cliente: emp.cliente,
        coordenadas: emp.coordenadas,
        direccion: emp.direccion,
        estadisticas
      };
    })
  );

  res.status(200).json({
    success: true,
    data: {
      emplazamientos: emplazamientosConEstadisticas
    }
  });
});
