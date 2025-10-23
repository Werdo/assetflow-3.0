const Alerta = require('../models/Alerta');
const Deposito = require('../models/Deposito');
const { asyncHandler } = require('../utils/errorHandler');
const { NotFoundError, ValidationError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * @desc    Obtener todas las alertas
 * @route   GET /api/alertas
 * @access  Private
 */
exports.getAlertas = asyncHandler(async (req, res) => {
  const {
    tipo,
    prioridad,
    resuelta,
    deposito,
    desde,
    hasta,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    order = 'desc'
  } = req.query;

  const query = {};

  // Filtros
  if (tipo) {
    query.tipo = tipo;
  }

  if (prioridad) {
    query.prioridad = prioridad;
  }

  if (resuelta !== undefined) {
    query.resuelta = resuelta === 'true';
  }

  if (deposito) {
    query.deposito = deposito;
  }

  if (desde || hasta) {
    query.createdAt = {};
    if (desde) query.createdAt.$gte = new Date(desde);
    if (hasta) query.createdAt.$lte = new Date(hasta);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortOrder = order === 'asc' ? 1 : -1;

  const [alertas, total] = await Promise.all([
    Alerta.find(query)
      .populate({
        path: 'deposito',
        select: 'numeroDeposito producto emplazamiento cantidad valorTotal',
        populate: [
          { path: 'producto', select: 'codigo nombre' },
          {
            path: 'emplazamiento',
            select: 'nombre cliente',
            populate: { path: 'cliente', select: 'nombre cif' }
          }
        ]
      })
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit)),
    Alerta.countDocuments(query)
  ]);

  res.status(200).json({
    success: true,
    data: {
      alertas: alertas.map(a => a.toPublicJSON()),
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
 * @desc    Obtener alerta por ID
 * @route   GET /api/alertas/:id
 * @access  Private
 */
exports.getAlerta = asyncHandler(async (req, res) => {
  const alerta = await Alerta.findById(req.params.id)
    .populate({
      path: 'deposito',
      select: 'numeroDeposito producto emplazamiento cantidad valorTotal fechaVencimiento estado',
      populate: [
        { path: 'producto', select: 'codigo nombre categoria' },
        {
          path: 'emplazamiento',
          select: 'nombre direccion coordenadas cliente',
          populate: { path: 'cliente', select: 'nombre cif direccion contacto' }
        }
      ]
    });

  if (!alerta) {
    throw new NotFoundError('Alerta');
  }

  res.status(200).json({
    success: true,
    data: {
      alerta: alerta.toPublicJSON()
    }
  });
});

/**
 * @desc    Crear nueva alerta manual
 * @route   POST /api/alertas
 * @access  Private (Admin/Manager)
 */
exports.createAlerta = asyncHandler(async (req, res) => {
  const { tipo, prioridad, mensaje, deposito, observaciones } = req.body;

  // Si hay depósito afectado, verificar que existe
  if (deposito) {
    const depositoDoc = await Deposito.findById(deposito);
    if (!depositoDoc) {
      throw new ValidationError('Depósito no encontrado');
    }
  }

  const alerta = await Alerta.create({
    tipo,
    prioridad,
    mensaje,
    deposito,
    observaciones
  });

  await alerta.populate({
    path: 'deposito',
    select: 'numeroDeposito producto emplazamiento',
    populate: [
      { path: 'producto', select: 'codigo nombre' },
      {
        path: 'emplazamiento',
        select: 'nombre cliente',
        populate: { path: 'cliente', select: 'nombre' }
      }
    ]
  });

  logger.info('Alerta creada manualmente', {
    alertaId: alerta._id,
    tipo: alerta.tipo,
    prioridad: alerta.prioridad,
    userId: req.user.id
  });

  res.status(201).json({
    success: true,
    message: 'Alerta creada exitosamente',
    data: {
      alerta: alerta.toPublicJSON()
    }
  });
});

/**
 * @desc    Marcar alerta como resuelta
 * @route   PUT /api/alertas/:id/resolver
 * @access  Private (Admin/Manager)
 */
exports.resolverAlerta = asyncHandler(async (req, res) => {
  const alerta = await Alerta.findById(req.params.id);

  if (!alerta) {
    throw new NotFoundError('Alerta');
  }

  if (alerta.resuelta) {
    throw new ValidationError('La alerta ya está resuelta');
  }

  const { observaciones } = req.body;

  await alerta.marcarResuelta(observaciones);

  logger.info('Alerta resuelta', {
    alertaId: alerta._id,
    tipo: alerta.tipo,
    observaciones: observaciones || 'Sin observaciones',
    userId: req.user.id
  });

  res.status(200).json({
    success: true,
    message: 'Alerta resuelta exitosamente',
    data: {
      alerta: alerta.toPublicJSON()
    }
  });
});

/**
 * @desc    Eliminar alerta
 * @route   DELETE /api/alertas/:id
 * @access  Private (Admin)
 */
exports.deleteAlerta = asyncHandler(async (req, res) => {
  const alerta = await Alerta.findById(req.params.id);

  if (!alerta) {
    throw new NotFoundError('Alerta');
  }

  await alerta.deleteOne();

  logger.warn('Alerta eliminada', {
    alertaId: alerta._id,
    tipo: alerta.tipo,
    userId: req.user.id
  });

  res.status(200).json({
    success: true,
    message: 'Alerta eliminada exitosamente'
  });
});

/**
 * @desc    Obtener alertas activas (no resueltas)
 * @route   GET /api/alertas/activas/list
 * @access  Private
 */
exports.getAlertasActivas = asyncHandler(async (req, res) => {
  const { prioridad, tipo, page = 1, limit = 20 } = req.query;

  const query = { resuelta: false };
  if (prioridad) query.prioridad = prioridad;
  if (tipo) query.tipo = tipo;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [alertas, total] = await Promise.all([
    Alerta.find(query)
      .populate({
        path: 'deposito',
        select: 'numeroDeposito producto emplazamiento',
        populate: [
          { path: 'producto', select: 'codigo nombre' },
          {
            path: 'emplazamiento',
            select: 'nombre cliente',
            populate: { path: 'cliente', select: 'nombre' }
          }
        ]
      })
      .sort({ prioridad: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Alerta.countDocuments(query)
  ]);

  res.status(200).json({
    success: true,
    data: {
      alertas: alertas.map(a => a.toPublicJSON()),
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
 * @desc    Obtener alertas críticas (prioridad alta)
 * @route   GET /api/alertas/criticas/list
 * @access  Private
 */
exports.getAlertasCriticas = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [alertas, total] = await Promise.all([
    Alerta.find({ prioridad: 'alta', resuelta: false })
      .populate({
        path: 'deposito',
        select: 'numeroDeposito producto emplazamiento cantidad valorTotal estado',
        populate: [
          { path: 'producto', select: 'codigo nombre' },
          {
            path: 'emplazamiento',
            select: 'nombre cliente',
            populate: { path: 'cliente', select: 'nombre' }
          }
        ]
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Alerta.countDocuments({ prioridad: 'alta', resuelta: false })
  ]);

  res.status(200).json({
    success: true,
    data: {
      alertas: alertas.map(a => a.toPublicJSON()),
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
 * @desc    Obtener alertas por prioridad
 * @route   GET /api/alertas/prioridad/:prioridad
 * @access  Private
 */
exports.getAlertasPorPrioridad = asyncHandler(async (req, res) => {
  const { prioridad } = req.params;
  const { page = 1, limit = 20 } = req.query;

  if (!['baja', 'media', 'alta'].includes(prioridad)) {
    throw new ValidationError('Prioridad inválida. Debe ser: baja, media o alta');
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [alertas, total] = await Promise.all([
    Alerta.find({ prioridad, resuelta: false })
      .populate({
        path: 'deposito',
        select: 'numeroDeposito producto emplazamiento',
        populate: [
          { path: 'producto', select: 'codigo nombre' },
          {
            path: 'emplazamiento',
            select: 'nombre cliente',
            populate: { path: 'cliente', select: 'nombre' }
          }
        ]
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Alerta.countDocuments({ prioridad, resuelta: false })
  ]);

  res.status(200).json({
    success: true,
    data: {
      alertas: alertas.map(a => a.toPublicJSON()),
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
 * @desc    Obtener estadísticas de alertas
 * @route   GET /api/alertas/estadisticas/general
 * @access  Private
 */
exports.getEstadisticas = asyncHandler(async (req, res) => {
  const { desde, hasta } = req.query;

  const query = {};
  if (desde || hasta) {
    query.createdAt = {};
    if (desde) query.createdAt.$gte = new Date(desde);
    if (hasta) query.createdAt.$lte = new Date(hasta);
  }

  const estadisticas = await Alerta.getEstadisticas();

  // Tendencia temporal (últimos 30 días)
  const hace30Dias = new Date();
  hace30Dias.setDate(hace30Dias.getDate() - 30);

  const tendencia = await Alerta.aggregate([
    {
      $match: {
        createdAt: { $gte: hace30Dias }
      }
    },
    {
      $group: {
        _id: {
          fecha: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          tipo: '$tipo'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.fecha': 1 } }
  ]);

  // Alertas por depósito
  const alertasPorDeposito = await Alerta.aggregate([
    {
      $match: {
        resuelta: false,
        deposito: { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: '$deposito',
        count: { $sum: 1 },
        prioridadAlta: {
          $sum: { $cond: [{ $eq: ['$prioridad', 'alta'] }, 1, 0] }
        }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'depositos',
        localField: '_id',
        foreignField: '_id',
        as: 'deposito'
      }
    },
    { $unwind: '$deposito' }
  ]);

  res.status(200).json({
    success: true,
    data: {
      estadisticas,
      tendencia: tendencia.map(t => ({
        fecha: t._id.fecha,
        tipo: t._id.tipo,
        count: t.count
      })),
      depositosConMasAlertas: alertasPorDeposito.map(a => ({
        deposito: {
          _id: a.deposito._id,
          numeroDeposito: a.deposito.numeroDeposito
        },
        totalAlertas: a.count,
        alertasAlta: a.prioridadAlta
      }))
    }
  });
});

/**
 * @desc    Generar alertas automáticas para todos los depósitos
 * @route   POST /api/alertas/generar-automaticas
 * @access  Private (Admin)
 */
exports.generarAlertasAutomaticas = asyncHandler(async (req, res) => {
  const depositosActivos = await Deposito.find({ activo: true })
    .populate('producto', 'codigo nombre precioUnitario');

  let alertasCreadas = 0;
  const resumen = {
    vencimiento: 0,
    stockBajo: 0,
    valorAlto: 0
  };

  for (const deposito of depositosActivos) {
    // Alerta de vencimiento
    if (deposito.fechaVencimiento) {
      const diasHastaVencimiento = deposito.getDiasHastaVencimiento();
      if (diasHastaVencimiento <= 30 && diasHastaVencimiento >= 0) {
        const alertaExistente = await Alerta.findOne({
          deposito: deposito._id,
          tipo: 'vencimiento_proximo',
          resuelta: false
        });

        if (!alertaExistente) {
          await Alerta.crearAlertaVencimiento(deposito);
          alertasCreadas++;
          resumen.vencimiento++;
        }
      } else if (diasHastaVencimiento < 0) {
        const alertaExistente = await Alerta.findOne({
          deposito: deposito._id,
          tipo: 'producto_vencido',
          resuelta: false
        });

        if (!alertaExistente) {
          await Alerta.create({
            tipo: 'producto_vencido',
            prioridad: 'alta',
            mensaje: `Depósito ${deposito.numeroDeposito} VENCIDO hace ${Math.abs(diasHastaVencimiento)} días`,
            deposito: deposito._id
          });
          alertasCreadas++;
          resumen.vencimiento++;
        }
      }
    }

    // Alerta de valor alto (> 10,000€)
    if (deposito.valorTotal > 10000) {
      const alertaExistente = await Alerta.findOne({
        deposito: deposito._id,
        tipo: 'valor_alto',
        resuelta: false
      });

      if (!alertaExistente) {
        await Alerta.crearAlertaValorAlto(deposito);
        alertasCreadas++;
        resumen.valorAlto++;
      }
    }
  }

  logger.info('Alertas automáticas generadas', {
    totalAlertas: alertasCreadas,
    resumen,
    userId: req.user.id
  });

  res.status(200).json({
    success: true,
    message: `Se generaron ${alertasCreadas} alerta(s) automática(s)`,
    data: {
      totalAlertas: alertasCreadas,
      resumen
    }
  });
});

/**
 * @desc    Resolver múltiples alertas
 * @route   PUT /api/alertas/resolver-multiples
 * @access  Private (Admin/Manager)
 */
exports.resolverMultiples = asyncHandler(async (req, res) => {
  const { alertaIds, observaciones } = req.body;

  if (!Array.isArray(alertaIds) || alertaIds.length === 0) {
    throw new ValidationError('Debe proporcionar un array de IDs de alertas');
  }

  const resultado = await Alerta.updateMany(
    {
      _id: { $in: alertaIds },
      resuelta: false
    },
    {
      resuelta: true,
      fechaResolucion: new Date(),
      observaciones: observaciones || 'Resueltas en lote'
    }
  );

  logger.info('Alertas resueltas en lote', {
    cantidad: resultado.modifiedCount,
    totalIds: alertaIds.length,
    userId: req.user.id
  });

  res.status(200).json({
    success: true,
    message: `${resultado.modifiedCount} alerta(s) resuelta(s) exitosamente`,
    data: {
      resueltas: resultado.modifiedCount
    }
  });
});
