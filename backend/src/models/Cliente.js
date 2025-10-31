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
  esSubcliente: {
    type: Boolean,
    default: false,
    index: true
  },
  clientePrincipal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    default: null,
    index: true
  },
  observaciones: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Pre-save hook: Auto-generate codigo if not provided (CLI-XXXXX or SUB-CLI-XXXXX format)
clienteSchema.pre('save', async function(next) {
  try {
    // Validación: Si es subcliente, debe tener cliente principal
    if (this.esSubcliente && !this.clientePrincipal) {
      return next(new Error('Un subcliente debe tener un cliente principal asignado'));
    }

    // Validación: Si no es subcliente, no debe tener cliente principal
    if (!this.esSubcliente && this.clientePrincipal) {
      this.clientePrincipal = null;
    }

    // Only generate codigo if it's a new document and codigo is not provided
    if (this.isNew && !this.codigo) {
      const Cliente = this.constructor;

      if (this.esSubcliente) {
        // Generar código para subcliente: SUB-CLI-XXXXX
        const lastSubcliente = await Cliente.findOne({ codigo: /^SUB-CLI-/ })
          .sort({ codigo: -1 })
          .limit(1)
          .select('codigo')
          .lean();

        let nextNumber = 1;
        if (lastSubcliente && lastSubcliente.codigo) {
          // Extract number from codigo (SUB-CLI-00001 -> 00001 -> 1)
          const match = lastSubcliente.codigo.match(/^SUB-CLI-(\d+)$/);
          if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
          }
        }

        // Generate new codigo with 5-digit zero-padded number
        this.codigo = `SUB-CLI-${String(nextNumber).padStart(5, '0')}`;
      } else {
        // Generar código para cliente principal: CLI-XXXXX
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
clienteSchema.index({ esSubcliente: 1 });
clienteSchema.index({ clientePrincipal: 1 });

// Virtual para emplazamientos del cliente
clienteSchema.virtual('emplazamientos', {
  ref: 'Emplazamiento',
  localField: '_id',
  foreignField: 'cliente',
  justOne: false
});

// Virtual para subclientes de este cliente
clienteSchema.virtual('subclientes', {
  ref: 'Cliente',
  localField: '_id',
  foreignField: 'clientePrincipal',
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
    esSubcliente: this.esSubcliente,
    clientePrincipal: this.clientePrincipal,
    observaciones: this.observaciones,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('Cliente', clienteSchema);
