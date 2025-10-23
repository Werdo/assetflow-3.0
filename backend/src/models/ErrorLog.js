const mongoose = require('mongoose');

/**
 * Modelo para almacenar logs de errores del sistema
 * Usado por el Error Log Agent para tracking y alertas
 */
const errorLogSchema = new mongoose.Schema({
  // Tipo de error
  tipo: {
    type: String,
    enum: ['error_500', 'uncaught_exception', 'unhandled_rejection', 'query_failed', 'timeout', 'ia_api_error', 'validation_error', 'auth_error', 'other'],
    required: true,
    index: true
  },

  // Severidad del error
  severidad: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
    default: 'medium',
    index: true
  },

  // Información del error
  mensaje: {
    type: String,
    required: true
  },

  stack: {
    type: String
  },

  // Contexto de la petición
  metodo: String, // GET, POST, PUT, DELETE
  ruta: String, // /api/depositos/123
  statusCode: Number,

  // Usuario que generó el error (si aplica)
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Datos adicionales
  datos: mongoose.Schema.Types.Mixed,

  // IP y User Agent
  ip: String,
  userAgent: String,

  // Información del servidor
  hostname: String,
  nodeVersion: String,
  memoria: {
    total: Number,
    usado: Number,
    libre: Number
  },

  // Estado
  resuelto: {
    type: Boolean,
    default: false,
    index: true
  },

  fechaResolucion: Date,

  // Notificación
  emailEnviado: {
    type: Boolean,
    default: false
  },

  fechaEnvioEmail: Date,

  // Metadata
  fechaError: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Contador de ocurrencias del mismo error
  ocurrencias: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Índices compuestos para búsquedas eficientes
errorLogSchema.index({ tipo: 1, severidad: 1 });
errorLogSchema.index({ fechaError: -1, severidad: 1 });
errorLogSchema.index({ resuelto: 1, severidad: 1 });

/**
 * Método estático para registrar un error
 */
errorLogSchema.statics.registrarError = async function(errorData) {
  try {
    // Buscar si existe un error similar reciente (última hora)
    const unaHoraAtras = new Date(Date.now() - 60 * 60 * 1000);
    const errorExistente = await this.findOne({
      mensaje: errorData.mensaje,
      ruta: errorData.ruta,
      resuelto: false,
      fechaError: { $gte: unaHoraAtras }
    });

    if (errorExistente) {
      // Incrementar contador de ocurrencias
      errorExistente.ocurrencias += 1;
      errorExistente.fechaError = new Date();
      await errorExistente.save();
      return errorExistente;
    }

    // Crear nuevo error log
    const errorLog = new this(errorData);
    await errorLog.save();
    return errorLog;
  } catch (error) {
    console.error('Error al registrar error log:', error);
    throw error;
  }
};

/**
 * Método estático para obtener errores críticos sin resolver
 */
errorLogSchema.statics.getErroresCriticos = async function() {
  return await this.find({
    severidad: { $in: ['critical', 'high'] },
    resuelto: false
  })
    .sort({ fechaError: -1 })
    .limit(50)
    .populate('usuario', 'name email');
};

/**
 * Método estático para obtener estadísticas de errores
 */
errorLogSchema.statics.getEstadisticas = async function(desde, hasta) {
  const query = {};

  if (desde && hasta) {
    query.fechaError = { $gte: desde, $lte: hasta };
  }

  const [porTipo, porSeveridad, total, criticos] = await Promise.all([
    this.aggregate([
      { $match: query },
      { $group: { _id: '$tipo', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    this.aggregate([
      { $match: query },
      { $group: { _id: '$severidad', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    this.countDocuments(query),
    this.countDocuments({ ...query, severidad: 'critical', resuelto: false })
  ]);

  return {
    porTipo,
    porSeveridad,
    total,
    criticos,
    periodo: { desde, hasta }
  };
};

/**
 * Método para marcar como resuelto
 */
errorLogSchema.methods.marcarResuelto = async function() {
  this.resuelto = true;
  this.fechaResolucion = new Date();
  return await this.save();
};

module.exports = mongoose.model('ErrorLog', errorLogSchema);
