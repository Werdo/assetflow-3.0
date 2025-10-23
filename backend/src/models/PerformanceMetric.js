const mongoose = require('mongoose');

/**
 * Modelo para almacenar métricas de performance del sistema
 * Usado por el Performance Agent para monitoreo continuo
 */
const performanceMetricSchema = new mongoose.Schema({
  // Tipo de métrica
  tipo: {
    type: String,
    enum: ['api_response', 'query_time', 'system_resources', 'ia_usage'],
    required: true,
    index: true
  },

  // Métricas de API Response Time
  tiempoRespuesta: {
    promedio: Number, // ms
    minimo: Number,
    maximo: Number,
    total: Number
  },

  // Métricas de Queries
  queryStats: {
    queriesLentas: Number, // > 1000ms
    promedioTiempo: Number,
    totalQueries: Number
  },

  // Métricas de Recursos del Sistema
  recursos: {
    cpu: {
      porcentajeUso: Number,
      promedioUso: Number
    },
    memoria: {
      total: Number,
      usado: Number,
      libre: Number,
      porcentajeUso: Number
    },
    disco: {
      total: Number,
      usado: Number,
      libre: Number,
      porcentajeUso: Number
    }
  },

  // Métricas de uso de IA
  iaUsage: {
    totalConsultas: Number,
    tokensUsados: Number,
    costoEstimado: Number,
    tiempoPromedioRespuesta: Number,
    proveedor: String
  },

  // Métricas de tráfico
  trafico: {
    requestsPorMinuto: Number,
    totalRequests: Number,
    errores: Number,
    tasaError: Number // porcentaje
  },

  // Endpoints más lentos
  endpointsLentos: [{
    ruta: String,
    metodo: String,
    tiempoPromedio: Number,
    cantidad: Number
  }],

  // Alertas generadas
  alertas: [{
    tipo: String,
    mensaje: String,
    severidad: String,
    timestamp: Date
  }],

  // Estado general del sistema
  estadoGeneral: {
    type: String,
    enum: ['healthy', 'warning', 'critical'],
    default: 'healthy'
  },

  // Período de medición
  periodoInicio: {
    type: Date,
    required: true
  },

  periodoFin: {
    type: Date,
    required: true
  },

  // Metadata
  hostname: String,
  nodeVersion: String,
  environment: String
}, {
  timestamps: true
});

// Índices para consultas eficientes
performanceMetricSchema.index({ tipo: 1, periodoInicio: -1 });
performanceMetricSchema.index({ estadoGeneral: 1, createdAt: -1 });
performanceMetricSchema.index({ periodoInicio: -1, periodoFin: -1 });

/**
 * Método estático para obtener métricas recientes
 */
performanceMetricSchema.statics.getMetricasRecientes = async function(tipo, limite = 20) {
  const query = tipo ? { tipo } : {};

  return await this.find(query)
    .sort({ periodoInicio: -1 })
    .limit(limite);
};

/**
 * Método estático para obtener promedio de tiempo de respuesta
 */
performanceMetricSchema.statics.getPromedioTiempoRespuesta = async function(horas = 1) {
  const desdeHace = new Date(Date.now() - horas * 60 * 60 * 1000);

  const resultado = await this.aggregate([
    {
      $match: {
        tipo: 'api_response',
        periodoInicio: { $gte: desdeHace }
      }
    },
    {
      $group: {
        _id: null,
        promedioGeneral: { $avg: '$tiempoRespuesta.promedio' },
        minimoGeneral: { $min: '$tiempoRespuesta.minimo' },
        maximoGeneral: { $max: '$tiempoRespuesta.maximo' }
      }
    }
  ]);

  return resultado[0] || { promedioGeneral: 0, minimoGeneral: 0, maximoGeneral: 0 };
};

/**
 * Método estático para detectar degradación de performance
 */
performanceMetricSchema.statics.detectarDegradacion = async function() {
  const ultimaHora = new Date(Date.now() - 60 * 60 * 1000);
  const horaAnterior = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const [metricasRecientes, metricasAnteriores] = await Promise.all([
    this.aggregate([
      {
        $match: {
          tipo: 'api_response',
          periodoInicio: { $gte: ultimaHora }
        }
      },
      {
        $group: {
          _id: null,
          promedio: { $avg: '$tiempoRespuesta.promedio' }
        }
      }
    ]),
    this.aggregate([
      {
        $match: {
          tipo: 'api_response',
          periodoInicio: { $gte: horaAnterior, $lt: ultimaHora }
        }
      },
      {
        $group: {
          _id: null,
          promedio: { $avg: '$tiempoRespuesta.promedio' }
        }
      }
    ])
  ]);

  const promedioReciente = metricasRecientes[0]?.promedio || 0;
  const promedioAnterior = metricasAnteriores[0]?.promedio || 0;

  if (promedioAnterior === 0) {
    return { degradacion: false, porcentaje: 0 };
  }

  const porcentajeIncremento = ((promedioReciente - promedioAnterior) / promedioAnterior) * 100;

  return {
    degradacion: porcentajeIncremento > 50, // 50% más lento
    porcentaje: porcentajeIncremento,
    promedioReciente,
    promedioAnterior
  };
};

/**
 * Método estático para obtener estadísticas de recursos
 */
performanceMetricSchema.statics.getEstadisticasRecursos = async function(horas = 24) {
  const desde = new Date(Date.now() - horas * 60 * 60 * 1000);

  const resultado = await this.aggregate([
    {
      $match: {
        tipo: 'system_resources',
        periodoInicio: { $gte: desde }
      }
    },
    {
      $group: {
        _id: null,
        cpuPromedio: { $avg: '$recursos.cpu.porcentajeUso' },
        memoriaPromedio: { $avg: '$recursos.memoria.porcentajeUso' },
        discoPromedio: { $avg: '$recursos.disco.porcentajeUso' },
        cpuMaximo: { $max: '$recursos.cpu.porcentajeUso' },
        memoriaMaxima: { $max: '$recursos.memoria.porcentajeUso' },
        discoMaximo: { $max: '$recursos.disco.porcentajeUso' }
      }
    }
  ]);

  return resultado[0] || {
    cpuPromedio: 0,
    memoriaPromedio: 0,
    discoPromedio: 0,
    cpuMaximo: 0,
    memoriaMaxima: 0,
    discoMaximo: 0
  };
};

/**
 * Método para limpiar métricas antiguas (más de 30 días)
 */
performanceMetricSchema.statics.limpiarMetricasAntiguas = async function() {
  const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const resultado = await this.deleteMany({
    periodoInicio: { $lt: hace30Dias }
  });

  return resultado.deletedCount;
};

module.exports = mongoose.model('PerformanceMetric', performanceMetricSchema);
