const mongoose = require('mongoose');

const alertaSchema = new mongoose.Schema({
  tipo: {
    type: String,
    enum: ['vencimiento_proximo', 'vencimiento', 'stock_bajo', 'valor_alto', 'sin_movimiento', 'personalizada'],
    required: [true, 'El tipo de alerta es requerido'],
    index: true
  },
  prioridad: {
    type: String,
    enum: ['baja', 'media', 'alta', 'critica'],
    default: 'media',
    index: true
  },
  deposito: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deposito',
    index: true
  },
  emplazamiento: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Emplazamiento',
    index: true
  },
  producto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Producto',
    index: true
  },
  titulo: {
    type: String,
    required: [true, 'El título es requerido'],
    trim: true
  },
  descripcion: {
    type: String,
    required: [true, 'La descripción es requerida'],
    trim: true
  },
  fechaCreacion: {
    type: Date,
    default: Date.now,
    index: true
  },
  fechaResolucion: {
    type: Date
  },
  resuelta: {
    type: Boolean,
    default: false,
    index: true
  },
  notificadoPorEmail: {
    type: Boolean,
    default: false
  },
  usuariosNotificados: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  metadatos: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes
alertaSchema.index({ tipo: 1, resuelta: 1 });
alertaSchema.index({ prioridad: 1, resuelta: 1 });
alertaSchema.index({ fechaCreacion: -1 });
alertaSchema.index({ resuelta: 1, fechaCreacion: -1 });

// Método para marcar como resuelta
alertaSchema.methods.marcarResuelta = async function(usuario = null) {
  this.resuelta = true;
  this.fechaResolucion = new Date();

  if (usuario) {
    if (!this.usuariosNotificados.includes(usuario)) {
      this.usuariosNotificados.push(usuario);
    }
  }

  await this.save();
  return this;
};

// Método estático para crear alerta de vencimiento próximo
alertaSchema.statics.crearAlertaVencimiento = async function(deposito, diasHastaVencimiento) {
  const prioridad = diasHastaVencimiento <= 7 ? 'critica' :
                    diasHastaVencimiento <= 15 ? 'alta' : 'media';

  const alerta = await this.create({
    tipo: diasHastaVencimiento < 0 ? 'vencimiento' : 'vencimiento_proximo',
    prioridad,
    deposito: deposito._id,
    emplazamiento: deposito.emplazamiento,
    producto: deposito.producto,
    titulo: diasHastaVencimiento < 0
      ? 'Depósito vencido'
      : `Depósito próximo a vencer (${diasHastaVencimiento} días)`,
    descripcion: `El depósito tiene fecha de vencimiento ${diasHastaVencimiento < 0 ? 'vencida' : `en ${diasHastaVencimiento} días`}`,
    metadatos: {
      diasHastaVencimiento,
      fechaVencimiento: deposito.fechaVencimiento,
      cantidad: deposito.cantidad,
      valorTotal: deposito.valorTotal
    }
  });

  return alerta;
};

// Método estático para crear alerta de stock bajo
alertaSchema.statics.crearAlertaStockBajo = async function(producto, stockActual, umbralMinimo) {
  const alerta = await this.create({
    tipo: 'stock_bajo',
    prioridad: stockActual === 0 ? 'critica' : 'alta',
    producto: producto._id,
    titulo: stockActual === 0 ? 'Stock agotado' : 'Stock bajo',
    descripcion: `El producto "${producto.nombre}" tiene stock bajo. Actual: ${stockActual}, Mínimo: ${umbralMinimo}`,
    metadatos: {
      stockActual,
      umbralMinimo,
      codigoProducto: producto.codigo
    }
  });

  return alerta;
};

// Método estático para crear alerta de valor alto
alertaSchema.statics.crearAlertaValorAlto = async function(deposito, valorUmbral) {
  const alerta = await this.create({
    tipo: 'valor_alto',
    prioridad: deposito.valorTotal > valorUmbral * 2 ? 'alta' : 'media',
    deposito: deposito._id,
    emplazamiento: deposito.emplazamiento,
    producto: deposito.producto,
    titulo: 'Depósito de alto valor',
    descripcion: `El depósito tiene un valor de €${deposito.valorTotal.toFixed(2)}, superior al umbral de €${valorUmbral.toFixed(2)}`,
    metadatos: {
      valorTotal: deposito.valorTotal,
      valorUmbral,
      cantidad: deposito.cantidad
    }
  });

  return alerta;
};

// Método estático para obtener alertas activas
alertaSchema.statics.getAlertasActivas = function(filtros = {}) {
  const query = { resuelta: false, ...filtros };

  return this.find(query)
    .sort({ prioridad: -1, fechaCreacion: -1 })
    .populate('deposito producto emplazamiento');
};

// Método estático para obtener alertas por prioridad
alertaSchema.statics.getPorPrioridad = function(prioridad) {
  return this.find({ prioridad, resuelta: false })
    .sort({ fechaCreacion: -1 })
    .populate('deposito producto emplazamiento');
};

// Método estático para obtener estadísticas de alertas
alertaSchema.statics.getEstadisticas = async function() {
  const [activas, porTipo, porPrioridad] = await Promise.all([
    this.countDocuments({ resuelta: false }),
    this.aggregate([
      { $group: { _id: '$tipo', total: { $sum: 1 }, activas: { $sum: { $cond: ['$resuelta', 0, 1] } } } }
    ]),
    this.aggregate([
      { $match: { resuelta: false } },
      { $group: { _id: '$prioridad', count: { $sum: 1 } } }
    ])
  ]);

  return {
    totalActivas: activas,
    porTipo,
    porPrioridad
  };
};

// Método para datos públicos
alertaSchema.methods.toPublicJSON = function() {
  return {
    _id: this._id,
    tipo: this.tipo,
    prioridad: this.prioridad,
    deposito: this.deposito,
    emplazamiento: this.emplazamiento,
    producto: this.producto,
    titulo: this.titulo,
    descripcion: this.descripcion,
    fechaCreacion: this.fechaCreacion,
    fechaResolucion: this.fechaResolucion,
    resuelta: this.resuelta,
    notificadoPorEmail: this.notificadoPorEmail,
    metadatos: this.metadatos,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('Alerta', alertaSchema);
