const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: [true, 'El código es requerido'],
    unique: true,
    trim: true,
    uppercase: true
  },
  nombre: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true
  },
  descripcion: {
    type: String,
    trim: true
  },
  categoria: {
    type: String,
    trim: true,
    index: true
  },
  precioUnitario: {
    type: Number,
    required: [true, 'El precio unitario es requerido'],
    min: [0, 'El precio no puede ser negativo']
  },
  unidadMedida: {
    type: String,
    default: 'unidades',
    trim: true
  },
  stockEnNuestroAlmacen: {
    type: Number,
    default: 0,
    min: [0, 'El stock no puede ser negativo']
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
productoSchema.index({ codigo: 1 }, { unique: true });
productoSchema.index({ nombre: 1 });
productoSchema.index({ categoria: 1 });
productoSchema.index({ activo: 1 });

// Virtual para stock depositado (calculado desde Deposito)
productoSchema.virtual('stockDepositado', {
  ref: 'Deposito',
  localField: '_id',
  foreignField: 'producto',
  count: false
});

// Método para obtener stock total
productoSchema.methods.getStockTotal = async function() {
  const Deposito = mongoose.model('Deposito');
  const depositos = await Deposito.find({ producto: this._id, activo: true });

  const stockDepositado = depositos.reduce((sum, dep) => sum + (dep.cantidad || 0), 0);

  return {
    enAlmacen: this.stockEnNuestroAlmacen || 0,
    depositado: stockDepositado,
    total: (this.stockEnNuestroAlmacen || 0) + stockDepositado
  };
};

// Método para datos públicos
productoSchema.methods.toPublicJSON = function() {
  return {
    _id: this._id,
    codigo: this.codigo,
    nombre: this.nombre,
    descripcion: this.descripcion,
    categoria: this.categoria,
    precioUnitario: this.precioUnitario,
    unidadMedida: this.unidadMedida,
    stockEnNuestroAlmacen: this.stockEnNuestroAlmacen,
    activo: this.activo,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('Producto', productoSchema);
