const mongoose = require('mongoose');

const aiConsultaSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El usuario es requerido'],
    index: true
  },
  proveedor: {
    type: String,
    enum: ['openai', 'anthropic'],
    required: [true, 'El proveedor es requerido'],
    index: true
  },
  modelo: {
    type: String,
    required: [true, 'El modelo es requerido']
  },
  tipoConsulta: {
    type: String,
    enum: ['analisis_deposito', 'prediccion', 'recomendacion', 'optimizacion', 'resumen', 'personalizada'],
    required: [true, 'El tipo de consulta es requerido'],
    index: true
  },
  pregunta: {
    type: String,
    required: [true, 'La pregunta es requerida'],
    trim: true
  },
  contexto: {
    type: mongoose.Schema.Types.Mixed
  },
  respuesta: {
    type: String,
    required: [true, 'La respuesta es requerida']
  },
  tokensUsados: {
    prompt: { type: Number, default: 0 },
    completion: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  tiempoRespuesta: {
    type: Number, // Milisegundos
    required: true
  },
  estado: {
    type: String,
    enum: ['exitoso', 'error', 'timeout', 'limite_excedido'],
    default: 'exitoso',
    index: true
  },
  errorMensaje: {
    type: String
  },
  valoracion: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: {
    type: String,
    trim: true
  },
  fechaConsulta: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes
aiConsultaSchema.index({ usuario: 1, fechaConsulta: -1 });
aiConsultaSchema.index({ proveedor: 1, tipoConsulta: 1 });
aiConsultaSchema.index({ estado: 1, fechaConsulta: -1 });
aiConsultaSchema.index({ fechaConsulta: -1 });

// Método para calcular tokens totales
aiConsultaSchema.pre('save', function(next) {
  if (this.tokensUsados.prompt !== undefined && this.tokensUsados.completion !== undefined) {
    this.tokensUsados.total = this.tokensUsados.prompt + this.tokensUsados.completion;
  }
  next();
});

// Método para agregar valoración
aiConsultaSchema.methods.agregarValoracion = async function(valoracion, feedback = null) {
  if (valoracion < 1 || valoracion > 5) {
    throw new Error('La valoración debe estar entre 1 y 5');
  }

  this.valoracion = valoracion;
  if (feedback) {
    this.feedback = feedback;
  }

  await this.save();
  return this;
};

// Método estático para obtener historial de usuario
aiConsultaSchema.statics.getHistorialUsuario = function(usuarioId, limite = 50) {
  return this.find({ usuario: usuarioId })
    .sort({ fechaConsulta: -1 })
    .limit(limite)
    .select('-contexto'); // Excluir contexto para performance
};

// Método estático para obtener consultas por tipo
aiConsultaSchema.statics.getPorTipo = function(tipoConsulta, limite = 50) {
  return this.find({ tipoConsulta, estado: 'exitoso' })
    .sort({ fechaConsulta: -1 })
    .limit(limite)
    .populate('usuario', 'name email');
};

// Método estático para obtener estadísticas
aiConsultaSchema.statics.getEstadisticas = async function(fechaInicio, fechaFin) {
  const consultas = await this.find({
    fechaConsulta: {
      $gte: fechaInicio,
      $lte: fechaFin
    }
  });

  const stats = {
    total: consultas.length,
    exitosas: 0,
    errores: 0,
    porProveedor: {
      openai: 0,
      anthropic: 0
    },
    porTipo: {},
    tokensTotal: 0,
    tiempoPromedioMs: 0,
    valoracionPromedio: 0
  };

  let totalTiempo = 0;
  let totalValoraciones = 0;
  let sumaValoraciones = 0;

  consultas.forEach(consulta => {
    // Estado
    if (consulta.estado === 'exitoso') {
      stats.exitosas++;
    } else {
      stats.errores++;
    }

    // Proveedor
    stats.porProveedor[consulta.proveedor]++;

    // Tipo
    if (!stats.porTipo[consulta.tipoConsulta]) {
      stats.porTipo[consulta.tipoConsulta] = 0;
    }
    stats.porTipo[consulta.tipoConsulta]++;

    // Tokens
    stats.tokensTotal += consulta.tokensUsados.total || 0;

    // Tiempo
    totalTiempo += consulta.tiempoRespuesta || 0;

    // Valoración
    if (consulta.valoracion) {
      sumaValoraciones += consulta.valoracion;
      totalValoraciones++;
    }
  });

  stats.tiempoPromedioMs = consultas.length > 0 ? Math.round(totalTiempo / consultas.length) : 0;
  stats.valoracionPromedio = totalValoraciones > 0 ? (sumaValoraciones / totalValoraciones).toFixed(2) : 0;

  return stats;
};

// Método estático para obtener consultas recientes
aiConsultaSchema.statics.getRecientes = function(limite = 20) {
  return this.find()
    .sort({ fechaConsulta: -1 })
    .limit(limite)
    .populate('usuario', 'name email')
    .select('-contexto');
};

// Método estático para obtener consultas similares
aiConsultaSchema.statics.getSimilares = async function(pregunta, limite = 5) {
  // Búsqueda simple por palabras clave (puede mejorarse con búsqueda vectorial)
  const palabrasClave = pregunta.toLowerCase().split(' ').filter(p => p.length > 3);

  const consultas = await this.find({
    estado: 'exitoso',
    pregunta: {
      $regex: palabrasClave.join('|'),
      $options: 'i'
    }
  })
  .sort({ fechaConsulta: -1 })
  .limit(limite)
  .select('pregunta respuesta tipoConsulta valoracion fechaConsulta');

  return consultas;
};

// Método para datos públicos
aiConsultaSchema.methods.toPublicJSON = function() {
  return {
    _id: this._id,
    usuario: this.usuario,
    proveedor: this.proveedor,
    modelo: this.modelo,
    tipoConsulta: this.tipoConsulta,
    pregunta: this.pregunta,
    respuesta: this.respuesta,
    tokensUsados: this.tokensUsados,
    tiempoRespuesta: this.tiempoRespuesta,
    estado: this.estado,
    valoracion: this.valoracion,
    feedback: this.feedback,
    fechaConsulta: this.fechaConsulta,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('AI_Consulta', aiConsultaSchema);
