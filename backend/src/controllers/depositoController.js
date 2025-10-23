const Deposito = require('../models/Deposito');
const Producto = require('../models/Producto');
const Emplazamiento = require('../models/Emplazamiento');
const Cliente = require('../models/Cliente');
const Movimiento = require('../models/Movimiento');
const Alerta = require('../models/Alerta');
const { asyncHandler } = require('../utils/errorHandler');
const { NotFoundError, ValidationError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * @desc    Obtener todos los depósitos
 * @route   GET /api/depositos
 * @access  Private
 */
exports.getDepositos = asyncHandler(async (req, res) => {
  const {
    cliente,
    emplazamiento,
    producto,
    estado,
    activo,
    search,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    order = 'desc'
  } = req.query;

  const query = {};

  // Filtros
  // Note: cliente filter is handled through emplazamiento relationship
  if (cliente) {
    // Find emplazamientos that belong to this cliente
    const emplazamientosDelCliente = await Emplazamiento.find({ cliente }).select('_id');
    const emplazamientoIds = emplazamientosDelCliente.map(e => e._id);
    query.emplazamiento = { $in: emplazamientoIds };
  } else if (emplazamiento) {
    query.emplazamiento = emplazamiento;
  }

  if (producto) {
    query.producto = producto;
  }

  if (estado) {
    query.estado = estado;
  }

  if (activo !== undefined) {
    query.activo = activo === 'true';
  }

  if (search) {
    query.$or = [
      { numeroDeposito: { $regex: search, $options: 'i' } },
      { lote: { $regex: search, $options: 'i' } },
      { numeroFactura: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortOrder = order === 'asc' ? 1 : -1;

  const [depositos, total] = await Promise.all([
    Deposito.find(query)
      .populate('producto', 'codigo nombre categoria unidadMedida')
      .populate({
        path: 'emplazamiento',
        select: 'nombre direccion cliente',
        populate: {
          path: 'cliente',
          select: 'nombre cif'
        }
      })
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit)),
    Deposito.countDocuments(query)
  ]);

  // Calcular totales
  const totales = await Deposito.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        cantidadTotal: { $sum: '$cantidad' },
        valorTotal: { $sum: '$valorTotal' }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      depositos: depositos.map(d => d.toPublicJSON()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      totales: totales.length > 0 ? {
        cantidadTotal: totales[0].cantidadTotal,
        valorTotal: totales[0].valorTotal
      } : {
        cantidadTotal: 0,
        valorTotal: 0
      }
    }
  });
});

/**
 * @desc    Obtener depósito por ID
 * @route   GET /api/depositos/:id
 * @access  Private
 */
exports.getDeposito = asyncHandler(async (req, res) => {
  const deposito = await Deposito.findById(req.params.id)
    .populate('producto', 'codigo nombre descripcion categoria precioUnitario unidadMedida')
    .populate({
      path: 'emplazamiento',
      select: 'nombre direccion coordenadas contacto cliente',
      populate: {
        path: 'cliente',
        select: 'nombre cif direccion contacto'
      }
    });

  if (!deposito) {
    throw new NotFoundError('Depósito');
  }

  // Obtener historial de movimientos
  const movimientos = await Movimiento.find({ deposito: deposito._id })
    .sort({ fecha: -1 })
    .limit(20)
    .populate('usuario', 'name email');

  // Obtener alertas relacionadas
  const alertas = await Alerta.find({
    deposito: deposito._id,
    resuelta: false
  }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: {
      deposito: deposito.toPublicJSON(),
      diasHastaVencimiento: deposito.getDiasHastaVencimiento(),
      movimientos: movimientos.map(m => ({
        _id: m._id,
        tipo: m.tipo,
        cantidad: m.cantidad,
        fecha: m.fecha,
        observaciones: m.observaciones,
        usuario: m.usuario
      })),
      alertas: alertas.map(a => a.toPublicJSON())
    }
  });
});

/**
 * @desc    Crear nuevo depósito
 * @route   POST /api/depositos
 * @access  Private (Admin/Manager)
 */
exports.createDeposito = asyncHandler(async (req, res) => {
  const {
    producto,
    cliente,
    emplazamiento,
    cantidad,
    valorUnitario,
    lote,
    fechaDeposito,
    fechaVencimiento,
    numeroFactura,
    observaciones
  } = req.body;

  // Verificar que producto existe y está activo
  const productoDoc = await Producto.findById(producto);
  if (!productoDoc) {
    throw new ValidationError('Producto no encontrado');
  }
  if (!productoDoc.activo) {
    throw new ValidationError('El producto está inactivo');
  }

  // Verificar que cliente existe y está activo
  const clienteDoc = await Cliente.findById(cliente);
  if (!clienteDoc) {
    throw new ValidationError('Cliente no encontrado');
  }
  if (!clienteDoc.activo) {
    throw new ValidationError('El cliente está inactivo');
  }

  // Verificar que emplazamiento existe, está activo y pertenece al cliente
  const emplazamientoDoc = await Emplazamiento.findById(emplazamiento);
  if (!emplazamientoDoc) {
    throw new ValidationError('Emplazamiento no encontrado');
  }
  if (!emplazamientoDoc.activo) {
    throw new ValidationError('El emplazamiento está inactivo');
  }
  if (emplazamientoDoc.cliente.toString() !== cliente) {
    throw new ValidationError('El emplazamiento no pertenece al cliente seleccionado');
  }

  // Validar cantidad
  if (cantidad <= 0) {
    throw new ValidationError('La cantidad debe ser mayor a 0');
  }

  // Validar fechas
  const fechaDepositoDate = new Date(fechaDeposito);
  if (fechaVencimiento) {
    const fechaVencimientoDate = new Date(fechaVencimiento);
    if (fechaVencimientoDate <= fechaDepositoDate) {
      throw new ValidationError('La fecha de vencimiento debe ser posterior a la fecha de depósito');
    }
  }

  // Generar número de depósito único
  const numeroDeposito = await generarNumeroDeposito();

  // Crear depósito (el pre-save hook calculará valorTotal y estado automáticamente)
  // NOTE: cliente is NOT stored in Deposito schema - it's accessed through emplazamiento
  const deposito = await Deposito.create({
    numeroDeposito,
    producto,
    emplazamiento,
    cantidad,
    valorUnitario: valorUnitario || productoDoc.precioUnitario,
    lote,
    fechaDeposito: fechaDepositoDate,
    fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : undefined,
    numeroFactura,
    observaciones
  });

  await deposito.populate([
    { path: 'producto', select: 'codigo nombre' },
    {
      path: 'emplazamiento',
      select: 'nombre cliente',
      populate: {
        path: 'cliente',
        select: 'nombre cif'
      }
    }
  ]);

  // Crear movimiento de entrada
  await Movimiento.create({
    tipo: 'entrada',
    deposito: deposito._id,
    producto: deposito.producto._id,
    cliente: deposito.emplazamiento.cliente._id,
    emplazamiento: deposito.emplazamiento._id,
    cantidad: deposito.cantidad,
    fecha: deposito.fechaDeposito,
    observaciones: `Depósito inicial - ${deposito.numeroDeposito}`,
    usuario: req.user.id
  });

  // Generar alerta si está próximo a vencimiento o ya vencido
  if (deposito.fechaVencimiento) {
    const diasHastaVencimiento = deposito.getDiasHastaVencimiento();
    if (diasHastaVencimiento <= 30) {
      await Alerta.crearAlertaVencimiento(deposito);
    }
  }

  logger.info('Depósito creado', {
    depositoId: deposito._id,
    numeroDeposito: deposito.numeroDeposito,
    cliente: clienteDoc.nombre,
    producto: productoDoc.codigo,
    cantidad: deposito.cantidad,
    valorTotal: deposito.valorTotal,
    userId: req.user.id
  });

  res.status(201).json({
    success: true,
    message: 'Depósito creado exitosamente',
    data: {
      deposito: deposito.toPublicJSON()
    }
  });
});

/**
 * @desc    Actualizar depósito
 * @route   PUT /api/depositos/:id
 * @access  Private (Admin/Manager)
 */
exports.updateDeposito = asyncHandler(async (req, res) => {
  let deposito = await Deposito.findById(req.params.id);

  if (!deposito) {
    throw new NotFoundError('Depósito');
  }

  // No permitir actualizar depósitos ya retirados o facturados
  if (deposito.estado === 'retirado' || deposito.estado === 'facturado') {
    throw new ValidationError(`No se puede actualizar un depósito en estado ${deposito.estado}`);
  }

  const {
    cantidad,
    valorUnitario,
    lote,
    fechaVencimiento,
    numeroFactura,
    observaciones
  } = req.body;

  const cambios = [];

  // Validar cantidad
  if (cantidad !== undefined) {
    if (cantidad <= 0) {
      throw new ValidationError('La cantidad debe ser mayor a 0');
    }
    if (cantidad !== deposito.cantidad) {
      cambios.push(`Cantidad: ${deposito.cantidad} → ${cantidad}`);
      deposito.cantidad = cantidad;
    }
  }

  if (valorUnitario !== undefined && valorUnitario !== deposito.valorUnitario) {
    cambios.push(`Valor unitario: ${deposito.valorUnitario} → ${valorUnitario}`);
    deposito.valorUnitario = valorUnitario;
  }

  if (lote !== undefined && lote !== deposito.lote) {
    cambios.push(`Lote: ${deposito.lote || 'N/A'} → ${lote}`);
    deposito.lote = lote;
  }

  if (fechaVencimiento !== undefined) {
    const nuevaFechaVencimiento = new Date(fechaVencimiento);
    if (nuevaFechaVencimiento <= deposito.fechaDeposito) {
      throw new ValidationError('La fecha de vencimiento debe ser posterior a la fecha de depósito');
    }
    cambios.push(`Fecha vencimiento: ${deposito.fechaVencimiento?.toISOString().split('T')[0] || 'N/A'} → ${nuevaFechaVencimiento.toISOString().split('T')[0]}`);
    deposito.fechaVencimiento = nuevaFechaVencimiento;
  }

  if (numeroFactura !== undefined && numeroFactura !== deposito.numeroFactura) {
    cambios.push(`Nº Factura: ${deposito.numeroFactura || 'N/A'} → ${numeroFactura}`);
    deposito.numeroFactura = numeroFactura;
  }

  if (observaciones !== undefined) {
    deposito.observaciones = observaciones;
  }

  // Guardar (el pre-save hook recalculará valorTotal y estado)
  await deposito.save();
  await deposito.populate([
    { path: 'producto', select: 'codigo nombre' },
    {
      path: 'emplazamiento',
      select: 'nombre cliente',
      populate: {
        path: 'cliente',
        select: 'nombre cif'
      }
    }
  ]);

  // Registrar movimiento si hubo cambios
  if (cambios.length > 0) {
    await Movimiento.create({
      tipo: 'modificacion',
      deposito: deposito._id,
      producto: deposito.producto._id,
      cliente: deposito.emplazamiento.cliente._id,
      emplazamiento: deposito.emplazamiento._id,
      cantidad: deposito.cantidad,
      observaciones: `Modificación: ${cambios.join(', ')}`,
      usuario: req.user.id
    });
  }

  logger.info('Depósito actualizado', {
    depositoId: deposito._id,
    numeroDeposito: deposito.numeroDeposito,
    cambios: cambios.join(', '),
    userId: req.user.id
  });

  res.status(200).json({
    success: true,
    message: 'Depósito actualizado exitosamente',
    data: {
      deposito: deposito.toPublicJSON()
    }
  });
});

/**
 * @desc    Eliminar depósito (soft delete)
 * @route   DELETE /api/depositos/:id
 * @access  Private (Admin)
 */
exports.deleteDeposito = asyncHandler(async (req, res) => {
  const deposito = await Deposito.findById(req.params.id);

  if (!deposito) {
    throw new NotFoundError('Depósito');
  }

  // No permitir eliminar depósitos ya facturados
  if (deposito.estado === 'facturado') {
    throw new ValidationError('No se puede eliminar un depósito facturado');
  }

  // Soft delete
  deposito.activo = false;
  await deposito.save();

  // Populate to get cliente through emplazamiento
  await deposito.populate({
    path: 'emplazamiento',
    select: 'cliente'
  });

  // Registrar movimiento
  await Movimiento.create({
    tipo: 'baja',
    deposito: deposito._id,
    producto: deposito.producto,
    cliente: deposito.emplazamiento.cliente,
    emplazamiento: deposito.emplazamiento._id,
    cantidad: deposito.cantidad,
    observaciones: `Depósito desactivado - ${deposito.numeroDeposito}`,
    usuario: req.user.id
  });

  logger.warn('Depósito desactivado', {
    depositoId: deposito._id,
    numeroDeposito: deposito.numeroDeposito,
    userId: req.user.id
  });

  res.status(200).json({
    success: true,
    message: 'Depósito desactivado exitosamente'
  });
});

/**
 * @desc    Extender plazo de depósito
 * @route   PUT /api/depositos/:id/extender-plazo
 * @access  Private (Admin/Manager)
 */
exports.extenderPlazo = asyncHandler(async (req, res) => {
  const deposito = await Deposito.findById(req.params.id);

  if (!deposito) {
    throw new NotFoundError('Depósito');
  }

  if (!deposito.activo) {
    throw new ValidationError('El depósito está inactivo');
  }

  if (deposito.estado === 'retirado' || deposito.estado === 'facturado') {
    throw new ValidationError(`No se puede extender el plazo de un depósito ${deposito.estado}`);
  }

  const { nuevaFechaVencimiento, motivo } = req.body;

  if (!nuevaFechaVencimiento) {
    throw new ValidationError('Debe proporcionar la nueva fecha de vencimiento');
  }

  const nuevaFecha = new Date(nuevaFechaVencimiento);
  const fechaActual = deposito.fechaVencimiento || deposito.fechaDeposito;

  if (nuevaFecha <= fechaActual) {
    throw new ValidationError('La nueva fecha debe ser posterior a la fecha actual de vencimiento');
  }

  const fechaAnterior = deposito.fechaVencimiento?.toISOString().split('T')[0];
  deposito.fechaVencimiento = nuevaFecha;
  await deposito.save();

  await deposito.populate([
    { path: 'producto', select: 'codigo nombre' },
    {
      path: 'emplazamiento',
      select: 'nombre cliente',
      populate: {
        path: 'cliente',
        select: 'nombre cif'
      }
    }
  ]);

  // Registrar movimiento
  await Movimiento.create({
    tipo: 'modificacion',
    deposito: deposito._id,
    producto: deposito.producto._id,
    cliente: deposito.emplazamiento.cliente._id,
    emplazamiento: deposito.emplazamiento._id,
    cantidad: deposito.cantidad,
    observaciones: `Plazo extendido de ${fechaAnterior || 'indefinido'} a ${nuevaFecha.toISOString().split('T')[0]}. Motivo: ${motivo || 'No especificado'}`,
    usuario: req.user.id
  });

  // Resolver alertas de vencimiento si el nuevo plazo es suficiente
  const diasHastaVencimiento = deposito.getDiasHastaVencimiento();
  if (diasHastaVencimiento > 30) {
    await Alerta.updateMany(
      {
        deposito: deposito._id,
        tipo: 'vencimiento_proximo',
        resuelta: false
      },
      {
        resuelta: true,
        observaciones: `Plazo extendido hasta ${nuevaFecha.toISOString().split('T')[0]}`
      }
    );
  }

  logger.info('Plazo de depósito extendido', {
    depositoId: deposito._id,
    numeroDeposito: deposito.numeroDeposito,
    fechaAnterior,
    nuevaFecha: nuevaFecha.toISOString().split('T')[0],
    motivo: motivo || 'No especificado',
    userId: req.user.id
  });

  res.status(200).json({
    success: true,
    message: 'Plazo extendido exitosamente',
    data: {
      deposito: deposito.toPublicJSON(),
      diasHastaVencimiento: deposito.getDiasHastaVencimiento()
    }
  });
});

/**
 * @desc    Marcar depósito como facturado
 * @route   PUT /api/depositos/:id/facturar
 * @access  Private (Admin/Manager)
 */
exports.marcarFacturado = asyncHandler(async (req, res) => {
  const deposito = await Deposito.findById(req.params.id);

  if (!deposito) {
    throw new NotFoundError('Depósito');
  }

  if (!deposito.activo) {
    throw new ValidationError('El depósito está inactivo');
  }

  if (deposito.estado === 'retirado') {
    throw new ValidationError('El depósito ya ha sido retirado');
  }

  if (deposito.estado === 'facturado') {
    throw new ValidationError('El depósito ya está facturado');
  }

  const { numeroFactura, fechaFacturacion, observaciones } = req.body;

  if (!numeroFactura) {
    throw new ValidationError('Debe proporcionar el número de factura');
  }

  deposito.numeroFactura = numeroFactura;
  deposito.estado = 'facturado';
  if (observaciones) {
    deposito.observaciones = deposito.observaciones
      ? `${deposito.observaciones}\n${observaciones}`
      : observaciones;
  }
  await deposito.save();

  await deposito.populate([
    { path: 'producto', select: 'codigo nombre' },
    {
      path: 'emplazamiento',
      select: 'nombre cliente',
      populate: {
        path: 'cliente',
        select: 'nombre cif'
      }
    }
  ]);

  // Registrar movimiento
  await Movimiento.create({
    tipo: 'facturacion',
    deposito: deposito._id,
    producto: deposito.producto._id,
    cliente: deposito.emplazamiento.cliente._id,
    emplazamiento: deposito.emplazamiento._id,
    cantidad: deposito.cantidad,
    fecha: fechaFacturacion ? new Date(fechaFacturacion) : new Date(),
    observaciones: `Facturado con nº ${numeroFactura}. ${observaciones || ''}`,
    usuario: req.user.id
  });

  logger.info('Depósito facturado', {
    depositoId: deposito._id,
    numeroDeposito: deposito.numeroDeposito,
    numeroFactura,
    valorTotal: deposito.valorTotal,
    userId: req.user.id
  });

  res.status(200).json({
    success: true,
    message: 'Depósito facturado exitosamente',
    data: {
      deposito: deposito.toPublicJSON()
    }
  });
});

/**
 * @desc    Marcar depósito como retirado/devuelto
 * @route   PUT /api/depositos/:id/retirar
 * @access  Private (Admin/Manager)
 */
exports.marcarRetirado = asyncHandler(async (req, res) => {
  const deposito = await Deposito.findById(req.params.id);

  if (!deposito) {
    throw new NotFoundError('Depósito');
  }

  if (!deposito.activo) {
    throw new ValidationError('El depósito está inactivo');
  }

  if (deposito.estado === 'retirado') {
    throw new ValidationError('El depósito ya ha sido retirado');
  }

  const { fechaRetiro, observaciones } = req.body;

  const resultado = await deposito.marcarComoRetirado(observaciones);

  await deposito.populate([
    { path: 'producto', select: 'codigo nombre' },
    {
      path: 'emplazamiento',
      select: 'nombre cliente',
      populate: {
        path: 'cliente',
        select: 'nombre cif'
      }
    }
  ]);

  // Registrar movimiento
  await Movimiento.create({
    tipo: 'salida',
    deposito: deposito._id,
    producto: deposito.producto._id,
    cliente: deposito.emplazamiento.cliente._id,
    emplazamiento: deposito.emplazamiento._id,
    cantidad: deposito.cantidad,
    fecha: fechaRetiro ? new Date(fechaRetiro) : new Date(),
    observaciones: `Retirado - ${deposito.numeroDeposito}. ${observaciones || ''}`,
    usuario: req.user.id
  });

  // Resolver alertas relacionadas
  await Alerta.updateMany(
    {
      deposito: deposito._id,
      resuelta: false
    },
    {
      resuelta: true,
      observaciones: `Depósito retirado el ${new Date().toISOString().split('T')[0]}`
    }
  );

  logger.info('Depósito retirado', {
    depositoId: deposito._id,
    numeroDeposito: deposito.numeroDeposito,
    userId: req.user.id
  });

  res.status(200).json({
    success: true,
    message: resultado.message,
    data: {
      deposito: deposito.toPublicJSON()
    }
  });
});

/**
 * @desc    Obtener depósitos próximos a vencer
 * @route   GET /api/depositos/proximos-vencer
 * @access  Private
 */
exports.getProximosVencer = asyncHandler(async (req, res) => {
  const { dias = 30, page = 1, limit = 20 } = req.query;

  const depositos = await Deposito.getProximosVencer(parseInt(dias));

  // Paginación manual
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const paginados = depositos.slice(skip, skip + parseInt(limit));
  const total = depositos.length;

  res.status(200).json({
    success: true,
    data: {
      depositos: paginados.map(d => ({
        ...d.toPublicJSON(),
        diasHastaVencimiento: d.getDiasHastaVencimiento()
      })),
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
 * @desc    Obtener depósitos vencidos
 * @route   GET /api/depositos/vencidos
 * @access  Private
 */
exports.getVencidos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const depositos = await Deposito.getVencidos();

  // Paginación manual
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const paginados = depositos.slice(skip, skip + parseInt(limit));
  const total = depositos.length;

  res.status(200).json({
    success: true,
    data: {
      depositos: paginados.map(d => ({
        ...d.toPublicJSON(),
        diasVencido: Math.abs(d.getDiasHastaVencimiento())
      })),
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
 * @desc    Obtener estadísticas de depósitos
 * @route   GET /api/depositos/estadisticas
 * @access  Private
 */
exports.getEstadisticas = asyncHandler(async (req, res) => {
  const { cliente, emplazamiento, desde, hasta } = req.query;

  const query = { activo: true };

  // Filter by cliente through emplazamiento relationship
  if (cliente) {
    const emplazamientosDelCliente = await Emplazamiento.find({ cliente }).select('_id');
    const emplazamientoIds = emplazamientosDelCliente.map(e => e._id);
    query.emplazamiento = { $in: emplazamientoIds };
  } else if (emplazamiento) {
    query.emplazamiento = emplazamiento;
  }
  if (desde || hasta) {
    query.fechaDeposito = {};
    if (desde) query.fechaDeposito.$gte = new Date(desde);
    if (hasta) query.fechaDeposito.$lte = new Date(hasta);
  }

  // Estadísticas generales
  const [totales, porEstado, porProducto, valoracion] = await Promise.all([
    Deposito.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalDepositos: { $sum: 1 },
          cantidadTotal: { $sum: '$cantidad' },
          valorTotal: { $sum: '$valorTotal' }
        }
      }
    ]),
    Deposito.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$estado',
          count: { $sum: 1 },
          valorTotal: { $sum: '$valorTotal' }
        }
      }
    ]),
    Deposito.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$producto',
          count: { $sum: 1 },
          cantidadTotal: { $sum: '$cantidad' },
          valorTotal: { $sum: '$valorTotal' }
        }
      },
      { $sort: { valorTotal: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'productos',
          localField: '_id',
          foreignField: '_id',
          as: 'producto'
        }
      },
      { $unwind: '$producto' }
    ]),
    Deposito.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          valorPromedio: { $avg: '$valorTotal' },
          valorMaximo: { $max: '$valorTotal' },
          valorMinimo: { $min: '$valorTotal' }
        }
      }
    ])
  ]);

  // Depósitos próximos a vencer y vencidos
  const proximosVencer = await Deposito.getProximosVencer(30);
  const vencidos = await Deposito.getVencidos();

  res.status(200).json({
    success: true,
    data: {
      totales: totales.length > 0 ? totales[0] : {
        totalDepositos: 0,
        cantidadTotal: 0,
        valorTotal: 0
      },
      porEstado: porEstado.map(e => ({
        estado: e._id,
        count: e.count,
        valorTotal: e.valorTotal
      })),
      porProducto: porProducto.map(p => ({
        producto: {
          _id: p.producto._id,
          codigo: p.producto.codigo,
          nombre: p.producto.nombre
        },
        count: p.count,
        cantidadTotal: p.cantidadTotal,
        valorTotal: p.valorTotal
      })),
      valoracion: valoracion.length > 0 ? valoracion[0] : {
        valorPromedio: 0,
        valorMaximo: 0,
        valorMinimo: 0
      },
      alertas: {
        proximosVencer: proximosVencer.length,
        vencidos: vencidos.length
      }
    }
  });
});

/**
 * Generar número de depósito único
 * Formato: DEP-YYYYMMDD-XXXX
 */
async function generarNumeroDeposito() {
  const fecha = new Date();
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  const prefijo = `DEP-${año}${mes}${dia}`;

  // Buscar el último número del día
  const ultimoDeposito = await Deposito.findOne({
    numeroDeposito: { $regex: `^${prefijo}` }
  }).sort({ numeroDeposito: -1 });

  let numero = 1;
  if (ultimoDeposito) {
    const ultimoNumero = parseInt(ultimoDeposito.numeroDeposito.split('-')[2]);
    numero = ultimoNumero + 1;
  }

  return `${prefijo}-${String(numero).padStart(4, '0')}`;
}
