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
  const { cliente, subcliente, activo, search, page = 1, limit = 20 } = req.query;

  const query = {};

  if (cliente) {
    // Find all subclientes of this cliente
    const subclientes = await Cliente.find({ clientePrincipal: cliente }).select('_id');
    const subclienteIds = subclientes.map(s => s._id);

    // Filter by cliente OR subcliente that belongs to this cliente
    query.$or = [
      { cliente: cliente },
      { subcliente: { $in: subclienteIds } }
    ];
  }

  if (subcliente !== undefined) {
    if (subcliente === 'null' || subcliente === '') {
      query.subcliente = null;
    } else {
      // Remove the $or from cliente filter if subcliente is specified
      delete query.$or;
      query.subcliente = subcliente;
    }
  }

  if (activo !== undefined) {
    query.activo = activo === 'true';
  }

  if (search) {
    query.$or = [
      { nombre: { $regex: search, $options: 'i' } },
      { codigo: { $regex: search, $options: 'i' } },
      { 'direccion.calle': { $regex: search, $options: 'i' } },
      { 'direccion.ciudad': { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [emplazamientos, total] = await Promise.all([
    Emplazamiento.find(query)
      .populate('cliente', 'nombre cif activo codigo')
      .populate({
        path: 'subcliente',
        select: 'nombre codigo clientePrincipal',
        populate: {
          path: 'clientePrincipal',
          select: 'nombre codigo'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Emplazamiento.countDocuments(query)
  ]);

  // Get statistics for each emplazamiento
  const Deposito = require('../models/Deposito');
  const emplazamientosConEstadisticas = await Promise.all(
    emplazamientos.map(async (emp) => {
      const depositos = await Deposito.find({
        emplazamiento: emp._id,
        activo: true
      });

      const valorTotal = depositos.reduce((sum, dep) => sum + (dep.valorTotal || 0), 0);
      const depositosActivos = depositos.length;

      // Calculate días mínimo to expiration
      let diasMinimo = null;
      const now = new Date();
      depositos.forEach(dep => {
        if (dep.fechaVencimiento) {
          const diff = Math.floor((dep.fechaVencimiento - now) / (1000 * 60 * 60 * 24));
          if (diasMinimo === null || diff < diasMinimo) {
            diasMinimo = diff;
          }
        }
      });

      return {
        ...emp.toPublicJSON(),
        valorTotal,
        depositosActivos,
        diasMinimo
      };
    })
  );

  res.status(200).json({
    success: true,
    data: {
      emplazamientos: emplazamientosConEstadisticas,
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
    .populate('cliente', 'nombre cif codigo direccion contacto')
    .populate({
      path: 'subcliente',
      select: 'nombre codigo cif clientePrincipal',
      populate: {
        path: 'clientePrincipal',
        select: 'nombre codigo'
      }
    });

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
  let { cliente, subcliente, nombre, direccion, coordenadas, contacto, observaciones } = req.body;

  // Si se especifica subcliente, obtener su cliente principal automáticamente
  let subclienteDoc = null;
  if (subcliente) {
    subclienteDoc = await Cliente.findById(subcliente);
    if (!subclienteDoc) {
      throw new ValidationError('Subcliente no encontrado');
    }
    if (!subclienteDoc.esSubcliente) {
      throw new ValidationError('El ID especificado no corresponde a un subcliente');
    }
    if (!subclienteDoc.activo) {
      throw new ValidationError('El subcliente está inactivo');
    }

    // Auto-asignar el cliente principal del subcliente
    cliente = subclienteDoc.clientePrincipal.toString();
  }

  // Verificar que el cliente existe y está activo
  const clienteDoc = await Cliente.findById(cliente);
  if (!clienteDoc) {
    throw new ValidationError('Cliente no encontrado');
  }
  if (!clienteDoc.activo) {
    throw new ValidationError('El cliente está inactivo');
  }
  if (clienteDoc.esSubcliente) {
    throw new ValidationError('El cliente debe ser un cliente principal, no un subcliente');
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
    subcliente: subcliente || null,
    nombre,
    direccion,
    coordenadas: {
      type: 'Point',
      coordinates: [lng, lat]
    },
    contacto,
    observaciones
  });

  await emplazamiento.populate('cliente', 'nombre cif codigo');
  if (subcliente) {
    await emplazamiento.populate('subcliente', 'nombre codigo');
  }

  logger.info('Emplazamiento creado', {
    emplazamientoId: emplazamiento._id,
    nombre: emplazamiento.nombre,
    cliente: clienteDoc.nombre,
    subcliente: subclienteDoc ? subclienteDoc.nombre : null,
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

  let { cliente, subcliente, nombre, direccion, coordenadas, contacto, observaciones, activo, estado } = req.body;

  // Si se envía estado en lugar de activo, convertirlo
  let activoValue = activo;
  if (estado !== undefined) {
    activoValue = estado === 'activo';
  }

  // Si cambia el subcliente, verificar y auto-asignar cliente principal
  if (subcliente !== undefined) {
    if (subcliente === null || subcliente === '') {
      // Se está eliminando el subcliente
      emplazamiento.subcliente = null;
      // El cliente se mantiene como está
    } else {
      // Se está asignando un subcliente
      const subclienteDoc = await Cliente.findById(subcliente);
      if (!subclienteDoc) {
        throw new ValidationError('Subcliente no encontrado');
      }
      if (!subclienteDoc.esSubcliente) {
        throw new ValidationError('El ID especificado no corresponde a un subcliente');
      }
      if (!subclienteDoc.activo) {
        throw new ValidationError('El subcliente está inactivo');
      }

      // Auto-asignar el cliente principal del subcliente
      cliente = subclienteDoc.clientePrincipal.toString();
      emplazamiento.subcliente = subcliente;
    }
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
    if (clienteDoc.esSubcliente) {
      throw new ValidationError('El cliente debe ser un cliente principal, no un subcliente');
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
  await emplazamiento.populate('cliente', 'nombre cif codigo');
  await emplazamiento.populate('subcliente', 'nombre codigo');

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
    .populate('cliente', 'nombre codigo')
    .populate({
      path: 'subcliente',
      select: 'nombre codigo clientePrincipal',
      populate: {
        path: 'clientePrincipal',
        select: 'nombre codigo'
      }
    })
    .select('nombre cliente subcliente coordenadas direccion');

  // Obtener estadísticas para cada emplazamiento
  const emplazamientosConEstadisticas = await Promise.all(
    emplazamientos.map(async (emp) => {
      const estadisticas = await emp.getEstadisticas();
      return {
        _id: emp._id,
        nombre: emp.nombre,
        cliente: emp.cliente,
        subcliente: emp.subcliente,
        coordenadas: emp.coordenadas,
        direccion: emp.direccion,
        ciudad: emp.direccion?.ciudad,
        provincia: emp.direccion?.provincia,
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
