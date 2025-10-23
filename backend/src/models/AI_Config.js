/**
 * AssetFlow 3.0 - AI_Config Model
 * Configuración de proveedores de IA (OpenAI y Anthropic)
 */

const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');

const aiConfigSchema = new mongoose.Schema({
  // Proveedor
  proveedor: {
    type: String,
    enum: ['openai', 'anthropic'],
    required: [true, 'El proveedor es obligatorio']
  },

  // Nombre display para identificar la configuración
  nombreDisplay: {
    type: String,
    required: [true, 'El nombre de configuración es obligatorio'],
    trim: true
  },

  // API Key encriptada (AES-256-CBC)
  apiKeyEncrypted: {
    type: String,
    required: [true, 'La API key es obligatoria'],
    select: false // No se incluye por defecto en queries
  },

  // URL de API (opcional, usa la por defecto si no se especifica)
  apiUrl: {
    type: String,
    trim: true
  },

  // Modelo a utilizar
  modelo: {
    type: String,
    required: [true, 'El modelo es obligatorio'],
    trim: true
    // Ejemplos: gpt-4-turbo-preview, gpt-3.5-turbo, claude-3-5-sonnet-20241022
  },

  // Parámetros del modelo
  maxTokens: {
    type: Number,
    default: 2000,
    min: [1, 'Max tokens debe ser al menos 1'],
    max: [100000, 'Max tokens no puede exceder 100000']
  },

  temperatura: {
    type: Number,
    default: 0.7,
    min: [0, 'Temperatura debe ser al menos 0'],
    max: [2, 'Temperatura no puede exceder 2']
  },

  // Estado y prioridad
  activo: {
    type: Boolean,
    default: true
  },

  // Prioridad de uso (1 = primera opción, 2+ = fallback)
  prioridadUso: {
    type: Number,
    default: 1,
    min: [1, 'Prioridad debe ser al menos 1'],
    max: [10, 'Prioridad no puede exceder 10']
  },

  // Control de costos
  costoPor1000Tokens: {
    type: Number,
    default: 0
  },

  limiteMensual: {
    type: Number,
    default: 100000, // Tokens por mes
    min: [0, 'Límite mensual debe ser al menos 0']
  },

  usoMensual: {
    type: Number,
    default: 0,
    min: [0, 'Uso mensual no puede ser negativo']
  },

  // Metadata
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  notas: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Índices
aiConfigSchema.index({ proveedor: 1 });
aiConfigSchema.index({ activo: 1 });
aiConfigSchema.index({ prioridadUso: 1 });
aiConfigSchema.index({ proveedor: 1, activo: 1, prioridadUso: 1 });

// Método para establecer API key (encripta automáticamente)
aiConfigSchema.methods.setApiKey = function(plainApiKey) {
  this.apiKeyEncrypted = encrypt(plainApiKey);
};

// Método para obtener API key desencriptada
aiConfigSchema.methods.getApiKey = function() {
  return decrypt(this.apiKeyEncrypted);
};

// Virtual para mostrar API key enmascarada (solo últimos 4 caracteres)
aiConfigSchema.virtual('apiKeyMasked').get(function() {
  if (!this.apiKeyEncrypted) return '••••••••';
  const decrypted = this.getApiKey();
  if (decrypted.length < 8) return '••••••••';
  return `••••••••${decrypted.slice(-4)}`;
});

// Método estático para obtener configuración activa por proveedor
aiConfigSchema.statics.getActiveConfig = async function(proveedor) {
  return await this.findOne({
    proveedor,
    activo: true
  })
    .select('+apiKeyEncrypted')
    .sort({ prioridadUso: 1 })
    .exec();
};

// Método estático para obtener todas las configuraciones activas ordenadas por prioridad
aiConfigSchema.statics.getAllActiveConfigs = async function() {
  return await this.find({ activo: true })
    .select('+apiKeyEncrypted')
    .sort({ prioridadUso: 1 })
    .exec();
};

// Método estático para incrementar uso mensual
aiConfigSchema.statics.incrementarUso = async function(configId, tokens) {
  return await this.findByIdAndUpdate(
    configId,
    { $inc: { usoMensual: tokens } },
    { new: true }
  );
};

// Método estático para resetear uso mensual (para ejecutar cada mes)
aiConfigSchema.statics.resetearUsoMensual = async function() {
  return await this.updateMany(
    {},
    { $set: { usoMensual: 0 } }
  );
};

// Middleware pre-save para encriptar API key si se proporciona como plaintext
aiConfigSchema.pre('save', function(next) {
  // Si apiKeyEncrypted se modificó y no parece encriptada, encriptarla
  if (this.isModified('apiKeyEncrypted')) {
    // Si no contiene el separador de IV, asumimos que es plaintext
    if (!this.apiKeyEncrypted.includes(':')) {
      const plainKey = this.apiKeyEncrypted;
      this.apiKeyEncrypted = encrypt(plainKey);
    }
  }
  next();
});

// Configurar virtuals en toJSON
aiConfigSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    // No incluir apiKeyEncrypted en el JSON
    delete ret.apiKeyEncrypted;
    return ret;
  }
});

aiConfigSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('AI_Config', aiConfigSchema);
