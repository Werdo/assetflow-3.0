const mongoose = require('mongoose');

const movimientoSchema = new mongoose.Schema({
  deposito: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deposito',
    required: [true, 'El depósito es requerido'],
    index: true
  },
  tipo: {
    type: String,
    enum: ['deposito', 'retirada', 'ajuste', 'transferencia'],
    required: [true, 'El tipo de movimiento es requerido'],
    index: true
  },
  cantidad: {
    type: Number,
    required: [true, 'La cantidad es requerida']
  },
  fecha: {
    type: Date,
    required: [true, 'La fecha es requerida'],
    default: Date.now,
    index: true
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  descripcion: {
    type: String,
    trim: true
  },
  origenTransferencia: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Emplazamiento'
  },
  destinoTransferencia: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Emplazamiento'
  }
}, {
  timestamps: true
});

// Indexes
movimientoSchema.index({ deposito: 1, fecha: -1 });
movimientoSchema.index({ tipo: 1, fecha: -1 });
movimientoSchema.index({ usuario: 1, fecha: -1 });
movimientoSchema.index({ fecha: -1 });

// Validación: transferencias deben tener origen y destino
movimientoSchema.pre('validate', function(next) {
  if (this.tipo === 'transferencia') {
    if (!this.origenTransferencia || !this.destinoTransferencia) {
      return next(new Error('Las transferencias requieren origen y destino'));
    }

    if (this.origenTransferencia.toString() === this.destinoTransferencia.toString()) {
      return next(new Error('El origen y destino no pueden ser el mismo'));
    }
  }

  next();
});

// Método estático para obtener historial de un depósito
movimientoSchema.statics.getHistorialDeposito = function(depositoId) {
  return this.find({ deposito: depositoId })
    .sort({ fecha: -1 })
    .populate('usuario', 'name email')
    .populate('origenTransferencia destinoTransferencia', 'nombre');
};

// Método estático para obtener movimientos por rango de fechas
movimientoSchema.statics.getPorRangoFechas = function(fechaInicio, fechaFin, tipo = null) {
  const query = {
    fecha: {
      $gte: fechaInicio,
      $lte: fechaFin
    }
  };

  if (tipo) {
    query.tipo = tipo;
  }

  return this.find(query)
    .sort({ fecha: -1 })
    .populate('deposito')
    .populate('usuario', 'name email');
};

// Método estático para obtener estadísticas de movimientos
movimientoSchema.statics.getEstadisticas = async function(fechaInicio, fechaFin) {
  const movimientos = await this.find({
    fecha: {
      $gte: fechaInicio,
      $lte: fechaFin
    }
  });

  const stats = {
    total: movimientos.length,
    porTipo: {
      deposito: 0,
      retirada: 0,
      ajuste: 0,
      transferencia: 0
    },
    cantidadTotal: {
      deposito: 0,
      retirada: 0,
      ajuste: 0,
      transferencia: 0
    }
  };

  movimientos.forEach(mov => {
    stats.porTipo[mov.tipo]++;
    stats.cantidadTotal[mov.tipo] += Math.abs(mov.cantidad);
  });

  return stats;
};

// Método para datos públicos
movimientoSchema.methods.toPublicJSON = function() {
  return {
    _id: this._id,
    deposito: this.deposito,
    tipo: this.tipo,
    cantidad: this.cantidad,
    fecha: this.fecha,
    usuario: this.usuario,
    descripcion: this.descripcion,
    origenTransferencia: this.origenTransferencia,
    destinoTransferencia: this.destinoTransferencia,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('Movimiento', movimientoSchema);
