const mongoose = require('mongoose');

const aiInsightSchema = new mongoose.Schema({
  tipo: {
    type: String,
    enum: [
      'tendencia',
      'anomalia',
      'prediccion',
      'optimizacion',
      'riesgo',
      'oportunidad',
      'recomendacion',
      'alerta_predictiva'
    ],
    required: [true, 'El tipo de insight es requerido'],
    index: true
  },
  categoria: {
    type: String,
    enum: ['inventario', 'valoracion', 'logistica', 'financiero', 'operacional'],
    required: [true, 'La categoría es requerida'],
    index: true
  },
  prioridad: {
    type: String,
    enum: ['baja', 'media', 'alta', 'critica'],
    default: 'media',
    index: true
  },
  titulo: {
    type: String,
    required: [true, 'El título es requerido'],
    trim: true
  },
  descripcion: {
    type: String,
    required: [true, 'La descripción es requerida']
  },
  hallazgos: [{
    clave: { type: String, required: true },
    valor: { type: mongoose.Schema.Types.Mixed, required: true },
    descripcion: { type: String }
  }],
  recomendaciones: [{
    accion: { type: String, required: true },
    impacto: { type: String, enum: ['bajo', 'medio', 'alto'], default: 'medio' },
    urgencia: { type: String, enum: ['baja', 'media', 'alta'], default: 'media' },
    descripcion: { type: String }
  }],
  entidadesRelacionadas: {
    depositos: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deposito'
    }],
    productos: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Producto'
    }],
    emplazamientos: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Emplazamiento'
    }],
    clientes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cliente'
    }]
  },
  metricas: {
    confianza: {
      type: Number,
      min: 0,
      max: 100,
      default: 75
    },
    impactoEstimado: {
      type: Number // Valor monetario en EUR
    },
    periodoAnalisis: {
      inicio: { type: Date },
      fin: { type: Date }
    }
  },
  generadoPor: {
    proveedor: {
      type: String,
      enum: ['openai', 'anthropic', 'sistema'],
      default: 'sistema'
    },
    modelo: { type: String },
    consulta: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AI_Consulta'
    }
  },
  estado: {
    type: String,
    enum: ['nuevo', 'revisado', 'en_accion', 'implementado', 'descartado'],
    default: 'nuevo',
    index: true
  },
  fechaGeneracion: {
    type: Date,
    default: Date.now,
    index: true
  },
  fechaExpiracion: {
    type: Date,
    index: true
  },
  visto: {
    type: Boolean,
    default: false,
    index: true
  },
  usuariosNotificados: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  valoracion: {
    util: { type: Number, min: 1, max: 5 },
    preciso: { type: Number, min: 1, max: 5 },
    accionable: { type: Number, min: 1, max: 5 }
  },
  notas: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes
aiInsightSchema.index({ tipo: 1, categoria: 1 });
aiInsightSchema.index({ prioridad: 1, estado: 1 });
aiInsightSchema.index({ estado: 1, fechaGeneracion: -1 });
aiInsightSchema.index({ visto: 1, prioridad: -1 });
aiInsightSchema.index({ fechaGeneracion: -1 });

// Middleware: Establecer fecha de expiración automáticamente
aiInsightSchema.pre('save', function(next) {
  if (!this.fechaExpiracion) {
    const diasExpiracion = this.tipo === 'tendencia' ? 30 :
                          this.tipo === 'prediccion' ? 15 :
                          this.tipo === 'anomalia' ? 7 : 30;

    const fechaExp = new Date();
    fechaExp.setDate(fechaExp.getDate() + diasExpiracion);
    this.fechaExpiracion = fechaExp;
  }
  next();
});

// Método para marcar como visto
aiInsightSchema.methods.marcarVisto = async function() {
  this.visto = true;
  await this.save();
  return this;
};

// Método para actualizar estado
aiInsightSchema.methods.actualizarEstado = async function(nuevoEstado) {
  const estadosValidos = ['nuevo', 'revisado', 'en_accion', 'implementado', 'descartado'];

  if (!estadosValidos.includes(nuevoEstado)) {
    throw new Error('Estado inválido');
  }

  this.estado = nuevoEstado;
  await this.save();
  return this;
};

// Método para agregar valoración
aiInsightSchema.methods.agregarValoracion = async function(util, preciso, accionable) {
  if (!this.valoracion) {
    this.valoracion = {};
  }

  if (util && (util < 1 || util > 5)) {
    throw new Error('Valoración debe estar entre 1 y 5');
  }
  if (preciso && (preciso < 1 || preciso > 5)) {
    throw new Error('Valoración debe estar entre 1 y 5');
  }
  if (accionable && (accionable < 1 || accionable > 5)) {
    throw new Error('Valoración debe estar entre 1 y 5');
  }

  if (util) this.valoracion.util = util;
  if (preciso) this.valoracion.preciso = preciso;
  if (accionable) this.valoracion.accionable = accionable;

  await this.save();
  return this;
};

// Método estático para obtener insights activos
aiInsightSchema.statics.getActivos = function(filtros = {}) {
  const query = {
    estado: { $nin: ['implementado', 'descartado'] },
    fechaExpiracion: { $gte: new Date() },
    ...filtros
  };

  return this.find(query)
    .sort({ prioridad: -1, fechaGeneracion: -1 })
    .populate('entidadesRelacionadas.depositos entidadesRelacionadas.productos entidadesRelacionadas.emplazamientos entidadesRelacionadas.clientes');
};

// Método estático para obtener insights por categoría
aiInsightSchema.statics.getPorCategoria = function(categoria) {
  return this.find({
    categoria,
    estado: { $nin: ['implementado', 'descartado'] },
    fechaExpiracion: { $gte: new Date() }
  })
  .sort({ prioridad: -1, fechaGeneracion: -1 });
};

// Método estático para obtener insights por prioridad
aiInsightSchema.statics.getPorPrioridad = function(prioridad) {
  return this.find({
    prioridad,
    estado: { $nin: ['implementado', 'descartado'] },
    fechaExpiracion: { $gte: new Date() }
  })
  .sort({ fechaGeneracion: -1 });
};

// Método estático para obtener insights no vistos
aiInsightSchema.statics.getNoVistos = function() {
  return this.find({
    visto: false,
    estado: 'nuevo',
    fechaExpiracion: { $gte: new Date() }
  })
  .sort({ prioridad: -1, fechaGeneracion: -1 });
};

// Método estático para obtener estadísticas
aiInsightSchema.statics.getEstadisticas = async function() {
  const [total, porEstado, porTipo, porPrioridad] = await Promise.all([
    this.countDocuments({ fechaExpiracion: { $gte: new Date() } }),
    this.aggregate([
      { $match: { fechaExpiracion: { $gte: new Date() } } },
      { $group: { _id: '$estado', count: { $sum: 1 } } }
    ]),
    this.aggregate([
      { $match: { fechaExpiracion: { $gte: new Date() } } },
      { $group: { _id: '$tipo', count: { $sum: 1 } } }
    ]),
    this.aggregate([
      { $match: { estado: { $nin: ['implementado', 'descartado'] }, fechaExpiracion: { $gte: new Date() } } },
      { $group: { _id: '$prioridad', count: { $sum: 1 } } }
    ])
  ]);

  return {
    total,
    porEstado,
    porTipo,
    porPrioridad
  };
};

// Método estático para limpiar insights expirados
aiInsightSchema.statics.limpiarExpirados = async function() {
  const resultado = await this.updateMany(
    {
      fechaExpiracion: { $lt: new Date() },
      estado: { $nin: ['implementado', 'en_accion'] }
    },
    {
      $set: { estado: 'descartado' }
    }
  );

  return resultado.modifiedCount;
};

// Método para datos públicos
aiInsightSchema.methods.toPublicJSON = function() {
  return {
    _id: this._id,
    tipo: this.tipo,
    categoria: this.categoria,
    prioridad: this.prioridad,
    titulo: this.titulo,
    descripcion: this.descripcion,
    hallazgos: this.hallazgos,
    recomendaciones: this.recomendaciones,
    entidadesRelacionadas: this.entidadesRelacionadas,
    metricas: this.metricas,
    generadoPor: this.generadoPor,
    estado: this.estado,
    fechaGeneracion: this.fechaGeneracion,
    fechaExpiracion: this.fechaExpiracion,
    visto: this.visto,
    valoracion: this.valoracion,
    notas: this.notas,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('AI_Insight', aiInsightSchema);
