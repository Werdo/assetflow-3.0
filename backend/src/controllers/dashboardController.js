const Deposito = require('../models/Deposito');
const Producto = require('../models/Producto');
const Cliente = require('../models/Cliente');
const Emplazamiento = require('../models/Emplazamiento');
const Alerta = require('../models/Alerta');
const Movimiento = require('../models/Movimiento');
const { asyncHandler } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * @desc    Obtener KPIs principales del dashboard
 * @route   GET /api/dashboard/kpis
 * @access  Private
 */
exports.getKPIs = asyncHandler(async (req, res) => {
  const { desde, hasta, cliente, emplazamiento } = req.query;

  // Filtro base
  const filtroDepositos = { activo: true };
  const filtroMovimientos = {};

  if (cliente) {
    filtroDepositos.cliente = cliente;
    filtroMovimientos.cliente = cliente;
  }

  if (emplazamiento) {
    filtroDepositos.emplazamiento = emplazamiento;
    filtroMovimientos.emplazamiento = emplazamiento;
  }

  if (desde || hasta) {
    filtroDepositos.fechaDeposito = {};
    filtroMovimientos.fecha = {};
    if (desde) {
      filtroDepositos.fechaDeposito.$gte = new Date(desde);
      filtroMovimientos.fecha.$gte = new Date(desde);
    }
    if (hasta) {
      filtroDepositos.fechaDeposito.$lte = new Date(hasta);
      filtroMovimientos.fecha.$lte = new Date(hasta);
    }
  }

  // Ejecutar todas las consultas en paralelo para máxima eficiencia
  const [
    totalesDepositos,
    depositosPorEstado,
    alertasActivas,
    alertasCriticas,
    proximosVencer,
    vencidos,
    valorPorCliente,
    valorPorProducto,
    movimientosRecientes,
    tendenciaDepositos
  ] = await Promise.all([
    // Total de depósitos y valoración
    Deposito.aggregate([
      { $match: filtroDepositos },
      {
        $group: {
          _id: null,
          totalDepositos: { $sum: 1 },
          cantidadTotal: { $sum: '$cantidad' },
          valorTotal: { $sum: '$valorTotal' },
          valorPromedio: { $avg: '$valorTotal' }
        }
      }
    ]),

    // Depósitos por estado
    Deposito.aggregate([
      { $match: filtroDepositos },
      {
        $group: {
          _id: '$estado',
          count: { $sum: 1 },
          valorTotal: { $sum: '$valorTotal' }
        }
      }
    ]),

    // Alertas activas
    Alerta.countDocuments({ resuelta: false }),

    // Alertas críticas
    Alerta.countDocuments({ resuelta: false, prioridad: 'alta' }),

    // Depósitos próximos a vencer
    Deposito.countDocuments({
      activo: true,
      fechaVencimiento: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    }),

    // Depósitos vencidos
    Deposito.countDocuments({
      activo: true,
      fechaVencimiento: { $lt: new Date() }
    }),

    // Valor por cliente (top 10)
    Deposito.aggregate([
      { $match: filtroDepositos },
      {
        $group: {
          _id: '$cliente',
          totalDepositos: { $sum: 1 },
          valorTotal: { $sum: '$valorTotal' }
        }
      },
      { $sort: { valorTotal: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'clientes',
          localField: '_id',
          foreignField: '_id',
          as: 'cliente'
        }
      },
      { $unwind: '$cliente' }
    ]),

    // Valor por producto (top 10)
    Deposito.aggregate([
      { $match: filtroDepositos },
      {
        $group: {
          _id: '$producto',
          totalDepositos: { $sum: 1 },
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

    // Movimientos recientes
    Movimiento.find(filtroMovimientos)
      .sort({ fecha: -1 })
      .limit(10)
      .populate('producto', 'codigo nombre')
      .populate('cliente', 'nombre')
      .populate('emplazamiento', 'nombre')
      .populate('usuario', 'name'),

    // Tendencia de depósitos (últimos 30 días)
    Deposito.aggregate([
      {
        $match: {
          fechaDeposito: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        $group: {
          _id: {
            fecha: { $dateToString: { format: '%Y-%m-%d', date: '$fechaDeposito' } }
          },
          count: { $sum: 1 },
          valorTotal: { $sum: '$valorTotal' }
        }
      },
      { $sort: { '_id.fecha': 1 } }
    ])
  ]);

  // Formatear respuesta
  const kpis = {
    totales: totalesDepositos.length > 0 ? {
      totalDepositos: totalesDepositos[0].totalDepositos,
      cantidadTotal: totalesDepositos[0].cantidadTotal,
      valorTotal: totalesDepositos[0].valorTotal,
      valorPromedio: totalesDepositos[0].valorPromedio
    } : {
      totalDepositos: 0,
      cantidadTotal: 0,
      valorTotal: 0,
      valorPromedio: 0
    },

    depositosPorEstado: depositosPorEstado.map(e => ({
      estado: e._id,
      count: e.count,
      valorTotal: e.valorTotal
    })),

    alertas: {
      activas: alertasActivas,
      criticas: alertasCriticas,
      proximosVencer,
      vencidos
    },

    topClientes: valorPorCliente.map(c => ({
      cliente: {
        _id: c.cliente._id,
        nombre: c.cliente.nombre,
        cif: c.cliente.cif
      },
      totalDepositos: c.totalDepositos,
      valorTotal: c.valorTotal
    })),

    topProductos: valorPorProducto.map(p => ({
      producto: {
        _id: p.producto._id,
        codigo: p.producto.codigo,
        nombre: p.producto.nombre
      },
      totalDepositos: p.totalDepositos,
      cantidadTotal: p.cantidadTotal,
      valorTotal: p.valorTotal
    })),

    movimientosRecientes: movimientosRecientes.map(m => ({
      _id: m._id,
      tipo: m.tipo,
      cantidad: m.cantidad,
      fecha: m.fecha,
      producto: m.producto ? {
        codigo: m.producto.codigo,
        nombre: m.producto.nombre
      } : null,
      cliente: m.cliente ? { nombre: m.cliente.nombre } : null,
      emplazamiento: m.emplazamiento ? { nombre: m.emplazamiento.nombre } : null,
      usuario: m.usuario ? { name: m.usuario.name } : null
    })),

    tendencia: tendenciaDepositos.map(t => ({
      fecha: t._id.fecha,
      count: t.count,
      valorTotal: t.valorTotal
    }))
  };

  res.status(200).json({
    success: true,
    data: kpis
  });
});

/**
 * @desc    Obtener datos para mapa de emplazamientos
 * @route   GET /api/dashboard/mapa
 * @access  Private
 */
exports.getMapaEmplazamientos = asyncHandler(async (req, res) => {
  const { cliente, conDepositos } = req.query;

  const query = { activo: true };
  if (cliente) {
    query.cliente = cliente;
  }

  // Obtener todos los emplazamientos activos
  const emplazamientos = await Emplazamiento.find(query)
    .populate('cliente', 'nombre cif')
    .select('nombre cliente coordenadas direccion contacto');

  // Obtener estadísticas para cada emplazamiento
  const emplazamientosConDatos = await Promise.all(
    emplazamientos.map(async (emp) => {
      // Obtener depósitos del emplazamiento
      const depositos = await Deposito.find({
        emplazamiento: emp._id,
        activo: true
      }).populate('producto', 'codigo nombre');

      // Si se solicita solo emplazamientos con depósitos y este no tiene, skip
      if (conDepositos === 'true' && depositos.length === 0) {
        return null;
      }

      // Calcular totales
      const totales = depositos.reduce((acc, dep) => {
        acc.totalDepositos++;
        acc.valorTotal += dep.valorTotal;
        return acc;
      }, { totalDepositos: 0, valorTotal: 0 });

      // Obtener alertas del emplazamiento
      const depositosIds = depositos.map(d => d._id);
      const alertasCount = await Alerta.countDocuments({
        deposito: { $in: depositosIds },
        resuelta: false
      });

      return {
        _id: emp._id,
        nombre: emp.nombre,
        cliente: emp.cliente,
        coordenadas: emp.coordenadas,
        direccion: emp.direccion,
        contacto: emp.contacto,
        estadisticas: {
          totalDepositos: totales.totalDepositos,
          valorTotal: totales.valorTotal,
          alertasActivas: alertasCount
        },
        depositos: depositos.map(d => ({
          _id: d._id,
          numeroDeposito: d.numeroDeposito,
          producto: d.producto ? {
            codigo: d.producto.codigo,
            nombre: d.producto.nombre
          } : null,
          cantidad: d.cantidad,
          valorTotal: d.valorTotal,
          estado: d.estado
        }))
      };
    })
  );

  // Filtrar nulls (emplazamientos sin depósitos cuando se filtró)
  const emplazamientosFiltrados = emplazamientosConDatos.filter(e => e !== null);

  res.status(200).json({
    success: true,
    data: {
      emplazamientos: emplazamientosFiltrados,
      total: emplazamientosFiltrados.length
    }
  });
});

/**
 * @desc    Obtener resumen de alertas críticas para dashboard
 * @route   GET /api/dashboard/alertas-criticas
 * @access  Private
 */
exports.getAlertasCriticas = asyncHandler(async (req, res) => {
  // Obtener alertas críticas no resueltas
  const alertasCriticas = await Alerta.find({
    prioridad: 'alta',
    resuelta: false
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate({
      path: 'deposito',
      select: 'numeroDeposito producto emplazamiento cantidad valorTotal',
      populate: [
        { path: 'producto', select: 'codigo nombre' },
        {
          path: 'emplazamiento',
          select: 'nombre cliente',
          populate: { path: 'cliente', select: 'nombre' }
        }
      ]
    });

  // Obtener depósitos vencidos
  const depositosVencidos = await Deposito.getVencidos();

  // Obtener depósitos próximos a vencer (30 días)
  const depositosProximosVencer = await Deposito.getProximosVencer(30);

  // Resumen por tipo de alerta
  const resumenAlertas = await Alerta.aggregate([
    { $match: { resuelta: false } },
    {
      $group: {
        _id: {
          tipo: '$tipo',
          prioridad: '$prioridad'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  res.status(200).json({
    success: true,
    data: {
      alertasCriticas: alertasCriticas.map(a => a.toPublicJSON()),
      depositosVencidos: depositosVencidos.slice(0, 10).map(d => ({
        ...d.toPublicJSON(),
        diasVencido: Math.abs(d.getDiasHastaVencimiento())
      })),
      depositosProximosVencer: depositosProximosVencer.slice(0, 10).map(d => ({
        ...d.toPublicJSON(),
        diasHastaVencimiento: d.getDiasHastaVencimiento()
      })),
      resumen: resumenAlertas.map(r => ({
        tipo: r._id.tipo,
        prioridad: r._id.prioridad,
        count: r.count
      })),
      totales: {
        criticas: alertasCriticas.length,
        vencidos: depositosVencidos.length,
        proximosVencer: depositosProximosVencer.length
      }
    }
  });
});

/**
 * @desc    Obtener estadísticas por cliente
 * @route   GET /api/dashboard/por-cliente/:clienteId
 * @access  Private
 */
exports.getEstadisticasPorCliente = asyncHandler(async (req, res) => {
  const { clienteId } = req.params;

  // Verificar que el cliente existe
  const cliente = await Cliente.findById(clienteId);
  if (!cliente) {
    throw new NotFoundError('Cliente');
  }

  // Obtener todas las estadísticas del cliente
  const [
    estadisticasCliente,
    emplazamientos,
    depositos,
    alertas,
    movimientos
  ] = await Promise.all([
    cliente.getEstadisticas(),

    Emplazamiento.find({ cliente: clienteId, activo: true })
      .select('nombre direccion'),

    Deposito.find({ cliente: clienteId, activo: true })
      .populate('producto', 'codigo nombre')
      .populate('emplazamiento', 'nombre'),

    Alerta.find({
      resuelta: false
    }).populate({
      path: 'deposito',
      match: { cliente: clienteId },
      select: 'numeroDeposito'
    }),

    Movimiento.find({ cliente: clienteId })
      .sort({ fecha: -1 })
      .limit(20)
      .populate('producto', 'codigo nombre')
      .populate('usuario', 'name')
  ]);

  // Filtrar alertas que tienen depósito del cliente
  const alertasCliente = alertas.filter(a => a.deposito !== null);

  // Calcular totales
  const totales = depositos.reduce((acc, dep) => {
    acc.totalDepositos++;
    acc.valorTotal += dep.valorTotal;
    acc.cantidadTotal += dep.cantidad;

    if (!acc.porEstado[dep.estado]) {
      acc.porEstado[dep.estado] = { count: 0, valor: 0 };
    }
    acc.porEstado[dep.estado].count++;
    acc.porEstado[dep.estado].valor += dep.valorTotal;

    return acc;
  }, {
    totalDepositos: 0,
    valorTotal: 0,
    cantidadTotal: 0,
    porEstado: {}
  });

  res.status(200).json({
    success: true,
    data: {
      cliente: cliente.toPublicJSON(),
      estadisticas: estadisticasCliente,
      totales,
      emplazamientos: emplazamientos.map(e => ({
        _id: e._id,
        nombre: e.nombre,
        direccion: e.direccion
      })),
      depositos: depositos.map(d => ({
        _id: d._id,
        numeroDeposito: d.numeroDeposito,
        producto: d.producto,
        emplazamiento: d.emplazamiento,
        cantidad: d.cantidad,
        valorTotal: d.valorTotal,
        estado: d.estado,
        fechaDeposito: d.fechaDeposito,
        fechaVencimiento: d.fechaVencimiento
      })),
      alertas: alertasCliente.map(a => a.toPublicJSON()),
      movimientosRecientes: movimientos.map(m => ({
        _id: m._id,
        tipo: m.tipo,
        cantidad: m.cantidad,
        fecha: m.fecha,
        producto: m.producto,
        usuario: m.usuario
      }))
    }
  });
});

/**
 * @desc    Obtener estadísticas por emplazamiento
 * @route   GET /api/dashboard/por-emplazamiento/:emplazamientoId
 * @access  Private
 */
exports.getEstadisticasPorEmplazamiento = asyncHandler(async (req, res) => {
  const { emplazamientoId } = req.params;

  // Verificar que el emplazamiento existe
  const emplazamiento = await Emplazamiento.findById(emplazamientoId)
    .populate('cliente', 'nombre cif direccion contacto');

  if (!emplazamiento) {
    throw new NotFoundError('Emplazamiento');
  }

  // Obtener estadísticas del emplazamiento
  const estadisticas = await emplazamiento.getEstadisticas();

  // Obtener depósitos del emplazamiento
  const depositos = await Deposito.find({
    emplazamiento: emplazamientoId,
    activo: true
  })
    .populate('producto', 'codigo nombre categoria unidadMedida')
    .sort({ fechaDeposito: -1 });

  // Obtener alertas relacionadas
  const depositosIds = depositos.map(d => d._id);
  const alertas = await Alerta.find({
    deposito: { $in: depositosIds },
    resuelta: false
  }).populate('deposito', 'numeroDeposito producto');

  // Obtener movimientos
  const movimientos = await Movimiento.find({
    emplazamiento: emplazamientoId
  })
    .sort({ fecha: -1 })
    .limit(20)
    .populate('producto', 'codigo nombre')
    .populate('usuario', 'name');

  // Calcular totales por producto
  const totalesPorProducto = depositos.reduce((acc, dep) => {
    const productoId = dep.producto._id.toString();
    if (!acc[productoId]) {
      acc[productoId] = {
        producto: dep.producto,
        count: 0,
        cantidadTotal: 0,
        valorTotal: 0
      };
    }
    acc[productoId].count++;
    acc[productoId].cantidadTotal += dep.cantidad;
    acc[productoId].valorTotal += dep.valorTotal;
    return acc;
  }, {});

  res.status(200).json({
    success: true,
    data: {
      emplazamiento: emplazamiento.toPublicJSON(),
      estadisticas,
      depositos: depositos.map(d => ({
        _id: d._id,
        numeroDeposito: d.numeroDeposito,
        producto: d.producto,
        cantidad: d.cantidad,
        valorTotal: d.valorTotal,
        estado: d.estado,
        fechaDeposito: d.fechaDeposito,
        fechaVencimiento: d.fechaVencimiento,
        diasHastaVencimiento: d.getDiasHastaVencimiento()
      })),
      totalesPorProducto: Object.values(totalesPorProducto),
      alertas: alertas.map(a => a.toPublicJSON()),
      movimientosRecientes: movimientos.map(m => ({
        _id: m._id,
        tipo: m.tipo,
        cantidad: m.cantidad,
        fecha: m.fecha,
        producto: m.producto,
        usuario: m.usuario
      }))
    }
  });
});

/**
 * @desc    Obtener resumen ejecutivo
 * @route   GET /api/dashboard/resumen-ejecutivo
 * @access  Private (Admin/Manager)
 */
exports.getResumenEjecutivo = asyncHandler(async (req, res) => {
  const { periodo = '30' } = req.query; // días
  const diasAtras = parseInt(periodo);
  const fechaInicio = new Date();
  fechaInicio.setDate(fechaInicio.getDate() - diasAtras);

  const [
    totalesGenerales,
    crecimientoDepositos,
    valoracionTendencia,
    alertasTendencia,
    topClientes,
    topProductos,
    productividad
  ] = await Promise.all([
    // Totales generales
    Promise.all([
      Deposito.countDocuments({ activo: true }),
      Cliente.countDocuments({ activo: true }),
      Emplazamiento.countDocuments({ activo: true }),
      Producto.countDocuments({ activo: true }),
      Alerta.countDocuments({ resuelta: false })
    ]),

    // Crecimiento de depósitos
    Deposito.aggregate([
      {
        $facet: {
          periodo: [
            { $match: { fechaDeposito: { $gte: fechaInicio }, activo: true } },
            { $count: 'count' }
          ],
          anterior: [
            {
              $match: {
                fechaDeposito: {
                  $gte: new Date(fechaInicio.getTime() - diasAtras * 24 * 60 * 60 * 1000),
                  $lt: fechaInicio
                },
                activo: true
              }
            },
            { $count: 'count' }
          ]
        }
      }
    ]),

    // Valoración tendencia
    Deposito.aggregate([
      { $match: { activo: true } },
      {
        $group: {
          _id: null,
          valorTotal: { $sum: '$valorTotal' },
          valorPromedio: { $avg: '$valorTotal' }
        }
      }
    ]),

    // Tendencia de alertas
    Alerta.aggregate([
      {
        $facet: {
          activas: [
            { $match: { resuelta: false } },
            { $count: 'count' }
          ],
          resueltas: [
            {
              $match: {
                resuelta: true,
                fechaResolucion: { $gte: fechaInicio }
              }
            },
            { $count: 'count' }
          ]
        }
      }
    ]),

    // Top 5 clientes por valor
    Deposito.aggregate([
      { $match: { activo: true } },
      {
        $group: {
          _id: '$cliente',
          totalDepositos: { $sum: 1 },
          valorTotal: { $sum: '$valorTotal' }
        }
      },
      { $sort: { valorTotal: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'clientes',
          localField: '_id',
          foreignField: '_id',
          as: 'cliente'
        }
      },
      { $unwind: '$cliente' }
    ]),

    // Top 5 productos por valor
    Deposito.aggregate([
      { $match: { activo: true } },
      {
        $group: {
          _id: '$producto',
          totalDepositos: { $sum: 1 },
          cantidadTotal: { $sum: '$cantidad' },
          valorTotal: { $sum: '$valorTotal' }
        }
      },
      { $sort: { valorTotal: -1 } },
      { $limit: 5 },
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

    // Productividad (movimientos en el periodo)
    Movimiento.aggregate([
      { $match: { fecha: { $gte: fechaInicio } } },
      {
        $group: {
          _id: '$tipo',
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  const [
    totalDepositos,
    totalClientes,
    totalEmplazamientos,
    totalProductos,
    totalAlertas
  ] = totalesGenerales;

  const crecimiento = crecimientoDepositos[0];
  const depositosPeriodo = crecimiento.periodo[0]?.count || 0;
  const depositosAnterior = crecimiento.anterior[0]?.count || 0;
  const crecimientoPorcentaje = depositosAnterior > 0
    ? ((depositosPeriodo - depositosAnterior) / depositosAnterior * 100).toFixed(2)
    : 0;

  res.status(200).json({
    success: true,
    data: {
      periodo: `Últimos ${diasAtras} días`,
      totales: {
        depositos: totalDepositos,
        clientes: totalClientes,
        emplazamientos: totalEmplazamientos,
        productos: totalProductos,
        alertasActivas: totalAlertas
      },
      crecimiento: {
        depositosNuevos: depositosPeriodo,
        depositosPeriodoAnterior: depositosAnterior,
        porcentajeCrecimiento: parseFloat(crecimientoPorcentaje)
      },
      valoracion: valoracionTendencia[0] || {
        valorTotal: 0,
        valorPromedio: 0
      },
      alertas: {
        activas: alertasTendencia[0].activas[0]?.count || 0,
        resueltasEnPeriodo: alertasTendencia[0].resueltas[0]?.count || 0
      },
      topClientes: topClientes.map(c => ({
        cliente: {
          _id: c.cliente._id,
          nombre: c.cliente.nombre,
          cif: c.cliente.cif
        },
        totalDepositos: c.totalDepositos,
        valorTotal: c.valorTotal
      })),
      topProductos: topProductos.map(p => ({
        producto: {
          _id: p.producto._id,
          codigo: p.producto.codigo,
          nombre: p.producto.nombre
        },
        totalDepositos: p.totalDepositos,
        cantidadTotal: p.cantidadTotal,
        valorTotal: p.valorTotal
      })),
      productividad: productividad.reduce((acc, p) => {
        acc[p._id] = p.count;
        return acc;
      }, {})
    }
  });
});
