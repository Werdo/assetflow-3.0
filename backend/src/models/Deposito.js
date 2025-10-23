const mongoose = require('mongoose');

const depositoSchema = new mongoose.Schema({
  numeroDeposito: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true
  },
  producto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Producto',
    required: [true, 'El producto es requerido'],
    index: true
  },
  emplazamiento: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Emplazamiento',
    required: [true, 'El emplazamiento es requerido'],
    index: true
  },
  cantidad: {
    type: Number,
    required: [true, 'La cantidad es requerida'],
    min: [0, 'La cantidad no puede ser negativa']
  },
  fechaDeposito: {
    type: Date,
    required: [true, 'La fecha de depósito es requerida'],
    default: Date.now,
    index: true
  },
  fechaVencimiento: {
    type: Date,
    index: true
  },
  valorUnitario: {
    type: Number,
    min: [0, 'El valor unitario no puede ser negativo']
  },
  valorTotal: {
    type: Number,
    min: [0, 'El valor total no puede ser negativo']
  },
  estado: {
    type: String,
    enum: ['activo', 'proximo_vencimiento', 'vencido', 'retirado'],
    default: 'activo',
    index: true
  },
  activo: {
    type: Boolean,
    default: true
  },
  observaciones: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes
depositoSchema.index({ numeroDeposito: 1 }, { unique: true, sparse: true });
depositoSchema.index({ producto: 1, emplazamiento: 1 });
depositoSchema.index({ fechaDeposito: 1 });
depositoSchema.index({ fechaVencimiento: 1 });
depositoSchema.index({ estado: 1 });
depositoSchema.index({ activo: 1 });

// Middleware: Auto-generate numeroDeposito y calcular valoración automáticamente antes de guardar
depositoSchema.pre('save', async function(next) {
  try {
    // Auto-generate numeroDeposito if not provided (DEP-2025-XXXXXXX format)
    if (this.isNew && !this.numeroDeposito) {
      const Deposito = this.constructor;
      const currentYear = new Date().getFullYear();
      const prefix = `DEP-${currentYear}-`;

      // Find the latest deposito with numeroDeposito for current year
      const lastDeposito = await Deposito.findOne({ numeroDeposito: new RegExp(`^${prefix}`) })
        .sort({ numeroDeposito: -1 })
        .limit(1)
        .select('numeroDeposito')
        .lean();

      let nextNumber = 1;
      if (lastDeposito && lastDeposito.numeroDeposito) {
        // Extract number from numeroDeposito (DEP-2025-0000001 -> 0000001 -> 1)
        const match = lastDeposito.numeroDeposito.match(/^DEP-\d{4}-(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      // Generate new numeroDeposito with 7-digit zero-padded number
      this.numeroDeposito = `${prefix}${String(nextNumber).padStart(7, '0')}`;
    }

    // Si el valorUnitario no está establecido, obtenerlo del producto
    if (!this.valorUnitario && this.producto) {
      const Producto = mongoose.model('Producto');
      const producto = await Producto.findById(this.producto);

      if (producto) {
        this.valorUnitario = producto.precioUnitario;
      }
    }

    // Calcular valorTotal
    if (this.valorUnitario !== undefined && this.cantidad !== undefined) {
      this.valorTotal = this.valorUnitario * this.cantidad;
    }

    // Actualizar estado basado en fecha de vencimiento
    if (this.fechaVencimiento) {
      const hoy = new Date();
      const diasHastaVencimiento = Math.ceil((this.fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));

      if (diasHastaVencimiento < 0) {
        this.estado = 'vencido';
      } else if (diasHastaVencimiento <= 30) {
        this.estado = 'proximo_vencimiento';
      } else if (this.activo) {
        this.estado = 'activo';
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Método para actualizar estado
depositoSchema.methods.actualizarEstado = function() {
  if (!this.activo) {
    this.estado = 'retirado';
    return this.estado;
  }

  if (this.fechaVencimiento) {
    const hoy = new Date();
    const diasHastaVencimiento = Math.ceil((this.fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));

    if (diasHastaVencimiento < 0) {
      this.estado = 'vencido';
    } else if (diasHastaVencimiento <= 30) {
      this.estado = 'proximo_vencimiento';
    } else {
      this.estado = 'activo';
    }
  } else {
    this.estado = 'activo';
  }

  return this.estado;
};

// Método para obtener días hasta vencimiento
depositoSchema.methods.getDiasHastaVencimiento = function() {
  if (!this.fechaVencimiento) {
    return null;
  }

  const hoy = new Date();
  const dias = Math.ceil((this.fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));

  return dias;
};

// Método para marcar como retirado
depositoSchema.methods.marcarComoRetirado = async function() {
  this.activo = false;
  this.estado = 'retirado';
  await this.save();

  // Crear movimiento de retirada
  const Movimiento = mongoose.model('Movimiento');
  await Movimiento.create({
    deposito: this._id,
    tipo: 'retirada',
    cantidad: this.cantidad,
    fecha: new Date(),
    descripcion: 'Depósito marcado como retirado'
  });

  return this;
};

// Método estático para obtener depósitos próximos a vencer
depositoSchema.statics.getProximosVencer = function(dias = 30) {
  const hoy = new Date();
  const fechaLimite = new Date();
  fechaLimite.setDate(hoy.getDate() + dias);

  return this.find({
    fechaVencimiento: {
      $gte: hoy,
      $lte: fechaLimite
    },
    activo: true,
    estado: { $ne: 'retirado' }
  }).populate('producto emplazamiento');
};

// Método estático para obtener depósitos vencidos
depositoSchema.statics.getVencidos = function() {
  const hoy = new Date();

  return this.find({
    fechaVencimiento: { $lt: hoy },
    activo: true,
    estado: { $ne: 'retirado' }
  }).populate('producto emplazamiento');
};

// Método para datos públicos
depositoSchema.methods.toPublicJSON = function() {
  // Calcular días hasta vencimiento
  let diasHastaVencimiento = null;
  if (this.fechaVencimiento) {
    const hoy = new Date();
    const fechaVenc = new Date(this.fechaVencimiento);
    diasHastaVencimiento = Math.ceil((fechaVenc - hoy) / (1000 * 60 * 60 * 24));
  }

  return {
    _id: this._id,
    numeroDeposito: this.numeroDeposito,
    producto: this.producto,
    emplazamiento: this.emplazamiento,
    cantidad: this.cantidad,
    fechaDeposito: this.fechaDeposito,
    fechaVencimiento: this.fechaVencimiento,
    diasHastaVencimiento: diasHastaVencimiento,
    valorUnitario: this.valorUnitario,
    valorTotal: this.valorTotal,
    estado: this.estado,
    activo: this.activo,
    observaciones: this.observaciones,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('Deposito', depositoSchema);
