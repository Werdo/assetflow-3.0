const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
  codigo: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true
  },
  nombre: {
    type: String,
    required: [true, 'El nombre del cliente es requerido'],
    trim: true,
    index: true
  },
  cif: {
    type: String,
    required: [true, 'El CIF es requerido'],
    unique: true,
    trim: true,
    uppercase: true
  },
  direccion: {
    calle: { type: String, trim: true },
    ciudad: { type: String, trim: true },
    provincia: { type: String, trim: true },
    codigoPostal: { type: String, trim: true },
    pais: { type: String, default: 'España', trim: true }
  },
  contacto: {
    nombre: { type: String, trim: true },
    telefono: { type: String, trim: true },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email inválido']
    }
  },
  activo: {
    type: Boolean,
    default: true
  },
  notas: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Pre-save hook: Auto-generate codigo if not provided (CLI-XXXXX format)
clienteSchema.pre('save', async function(next) {
  try {
    // Only generate codigo if it's a new document and codigo is not provided
    if (this.isNew && !this.codigo) {
      const Cliente = this.constructor;

      // Find the latest cliente with codigo starting with 'CLI-'
      const lastCliente = await Cliente.findOne({ codigo: /^CLI-/ })
        .sort({ codigo: -1 })
        .limit(1)
        .select('codigo')
        .lean();

      let nextNumber = 1;
      if (lastCliente && lastCliente.codigo) {
        // Extract number from codigo (CLI-00001 -> 00001 -> 1)
        const match = lastCliente.codigo.match(/^CLI-(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      // Generate new codigo with 5-digit zero-padded number
      this.codigo = `CLI-${String(nextNumber).padStart(5, '0')}`;
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Indexes
clienteSchema.index({ codigo: 1 }, { unique: true, sparse: true });
clienteSchema.index({ cif: 1 }, { unique: true });
clienteSchema.index({ nombre: 1 });
clienteSchema.index({ activo: 1 });
clienteSchema.index({ 'contacto.email': 1 });

// Virtual para emplazamientos del cliente
clienteSchema.virtual('emplazamientos', {
  ref: 'Emplazamiento',
  localField: '_id',
  foreignField: 'cliente',
  justOne: false
});

// Método para obtener estadísticas del cliente
clienteSchema.methods.getEstadisticas = async function() {
  const Emplazamiento = mongoose.model('Emplazamiento');
  const Deposito = mongoose.model('Deposito');

  const emplazamientos = await Emplazamiento.find({ cliente: this._id });
  const emplazamientoIds = emplazamientos.map(e => e._id);

  const depositos = await Deposito.find({
    emplazamiento: { $in: emplazamientoIds },
    activo: true
  });

  const valorTotal = depositos.reduce((sum, dep) => sum + (dep.valorTotal || 0), 0);

  return {
    totalEmplazamientos: emplazamientos.length,
    totalDepositos: depositos.length,
    valorTotalDepositado: valorTotal
  };
};

// Método para datos públicos
clienteSchema.methods.toPublicJSON = function() {
  return {
    _id: this._id,
    codigo: this.codigo,
    nombre: this.nombre,
    cif: this.cif,
    direccion: this.direccion,
    contacto: this.contacto,
    activo: this.activo,
    notas: this.notas,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('Cliente', clienteSchema);
