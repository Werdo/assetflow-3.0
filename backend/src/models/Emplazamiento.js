const mongoose = require('mongoose');

const emplazamientoSchema = new mongoose.Schema({
  codigo: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true
  },
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: [true, 'El cliente es requerido'],
    index: true
  },
  subcliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    default: null,
    index: true
  },
  nombre: {
    type: String,
    required: [true, 'El nombre del emplazamiento es requerido'],
    trim: true
  },
  direccion: {
    calle: { type: String, trim: true },
    ciudad: { type: String, trim: true },
    provincia: { type: String, trim: true },
    codigoPostal: { type: String, trim: true },
    pais: { type: String, default: 'España', trim: true }
  },
  coordenadas: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Las coordenadas son requeridas'],
      validate: {
        validator: function(coords) {
          return coords.length === 2 &&
                 coords[0] >= -180 && coords[0] <= 180 && // longitude
                 coords[1] >= -90 && coords[1] <= 90;     // latitude
        },
        message: 'Coordenadas inválidas [longitud, latitud]'
      }
    }
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
  observaciones: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Pre-save hook: Auto-generate codigo (EMP-OMN-XXXXXXX format)
emplazamientoSchema.pre('save', async function(next) {
  try {
    // ALWAYS generate codigo for new documents (ignore any provided codigo)
    if (this.isNew) {
      const Emplazamiento = this.constructor;
      const prefix = 'EMP-OMN-';

      // Find the latest emplazamiento with codigo
      const lastEmplazamiento = await Emplazamiento.findOne({ codigo: /^EMP-OMN-/ })
        .sort({ codigo: -1 })
        .limit(1)
        .select('codigo')
        .lean();

      let nextNumber = 1;
      if (lastEmplazamiento && lastEmplazamiento.codigo) {
        // Extract number from codigo (EMP-OMN-0000001 -> 0000001 -> 1)
        const match = lastEmplazamiento.codigo.match(/^EMP-OMN-(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      // Generate new codigo with 7-digit zero-padded number
      this.codigo = `${prefix}${String(nextNumber).padStart(7, '0')}`;
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Indexes
emplazamientoSchema.index({ codigo: 1 }, { unique: true, sparse: true });
emplazamientoSchema.index({ cliente: 1 });
emplazamientoSchema.index({ nombre: 1 });
emplazamientoSchema.index({ activo: 1 });
emplazamientoSchema.index({ coordenadas: '2dsphere' }); // Geospatial index

// Virtual para depósitos en este emplazamiento
emplazamientoSchema.virtual('depositos', {
  ref: 'Deposito',
  localField: '_id',
  foreignField: 'emplazamiento',
  justOne: false
});

// Método para calcular distancia a otro emplazamiento
emplazamientoSchema.methods.calcularDistancia = function(otroEmplazamiento) {
  const [lon1, lat1] = this.coordenadas.coordinates;
  const [lon2, lat2] = otroEmplazamiento.coordenadas.coordinates;

  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distancia = R * c;

  return Math.round(distancia * 100) / 100; // Redondear a 2 decimales
};

// Método para obtener estadísticas del emplazamiento
emplazamientoSchema.methods.getEstadisticas = async function() {
  const Deposito = mongoose.model('Deposito');

  const depositos = await Deposito.find({
    emplazamiento: this._id,
    activo: true
  }).populate('producto');

  const valorTotal = depositos.reduce((sum, dep) => sum + (dep.valorTotal || 0), 0);
  const cantidadTotal = depositos.reduce((sum, dep) => sum + (dep.cantidad || 0), 0);

  return {
    totalDepositos: depositos.length,
    cantidadTotalProductos: cantidadTotal,
    valorTotalDepositado: valorTotal
  };
};

// Método estático para buscar emplazamientos cercanos
emplazamientoSchema.statics.findCercanos = function(longitud, latitud, maxDistanciaKm = 50) {
  return this.find({
    coordenadas: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitud, latitud]
        },
        $maxDistance: maxDistanciaKm * 1000 // Convertir km a metros
      }
    },
    activo: true
  });
};

// Método para datos públicos
emplazamientoSchema.methods.toPublicJSON = function() {
  return {
    _id: this._id,
    codigo: this.codigo,
    cliente: this.cliente,
    subcliente: this.subcliente,
    nombre: this.nombre,
    direccion: this.direccion,
    coordenadas: this.coordenadas,
    contacto: this.contacto,
    activo: this.activo,
    estado: this.activo ? 'activo' : 'inactivo',
    observaciones: this.observaciones,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('Emplazamiento', emplazamientoSchema);
