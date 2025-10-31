/**
 * AssetFlow 3.0 - TypeScript Type Definitions
 * Complete type definitions for all entities and API responses
 */

// ============================================
// USER & AUTHENTICATION
// ============================================

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'manager' | 'user';
}

// ============================================
// PRODUCTO
// ============================================

export interface Producto {
  _id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  precioUnitario: number;
  unidadMedida?: string;
  stockEnNuestroAlmacen: number;
  activo: boolean;
  notas?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductoFormData {
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  precioUnitario: number;
  unidadMedida?: string;
  stockEnNuestroAlmacen?: number;
  activo?: boolean;
  notas?: string;
}

// ============================================
// CLIENTE
// ============================================

export interface Cliente {
  _id: string;
  codigo: string;
  nombre: string;
  cif?: string;
  direccionFiscal?: string;
  ciudad?: string;
  codigoPostal?: string;
  provincia?: string;
  pais?: string;
  telefono?: string;
  email?: string;
  contacto?: string;
  activo: boolean;
  esSubcliente?: boolean;
  clientePrincipal?: string | Cliente;
  notas?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClienteFormData {
  codigo: string;
  nombre: string;
  cif?: string;
  direccionFiscal?: string;
  ciudad?: string;
  codigoPostal?: string;
  provincia?: string;
  pais?: string;
  telefono?: string;
  email?: string;
  contacto?: string;
  activo?: boolean;
  esSubcliente?: boolean;
  clientePrincipal?: string;
  notas?: string;
}

export interface ClienteEstadisticas {
  totalEmplazamientos: number;
  totalDepositos: number;
  depositosActivos: number;
  depositosVencidos: number;
  valorTotalDepositado: number;
  alertasActivas: number;
}

// ============================================
// EMPLAZAMIENTO
// ============================================

export interface Coordenadas {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Emplazamiento {
  _id: string;
  codigo: string;
  nombre: string;
  cliente: string | Cliente;
  subcliente?: string | Cliente;

  // Ubicación física
  direccion: string;
  ciudad: string;
  codigoPostal?: string;
  provincia?: string;
  pais?: string;

  // Coordenadas para mapa
  coordenadas: {
    lat: number;
    lng: number;
  };

  // Información adicional
  capacidadM3?: number;
  tipoAlmacen?: 'general' | 'refrigerado' | 'congelado';
  responsable?: string;
  telefono?: string;
  email?: string;

  // Estado
  estado: 'activo' | 'inactivo';

  // Estadísticas (incluidas en lista)
  valorTotal?: number;
  depositosActivos?: number;
  diasMinimo?: number | null;

  observaciones?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmplazamientoFormData {
  codigo: string;
  nombre: string;
  cliente: string;

  // Ubicación
  direccion: string;
  ciudad: string;
  codigoPostal?: string;
  provincia?: string;
  pais?: string;

  // Coordenadas
  coordenadas: {
    lat: number;
    lng: number;
  };

  // Información adicional
  capacidadM3?: number;
  tipoAlmacen?: 'general' | 'refrigerado' | 'congelado';
  responsable?: string;
  telefono?: string;
  email?: string;

  estado?: 'activo' | 'inactivo';
  observaciones?: string;
}

export interface EmplazamientoParaMapa {
  _id: string;
  nombre: string;
  coordenadas: Coordenadas;
  cliente: {
    _id: string;
    nombre: string;
  };
  totalDepositos: number;
  valorTotal: number;
  depositosActivos: number;
  depositosVencidos: number;
  depositosProximosVencer: number;
  alertasCriticas: number;
  estado: 'normal' | 'warning' | 'critical';
}

export interface EmplazamientoEstadisticas {
  totalDepositos: number;
  depositosActivos: number;
  depositosRetirados: number;
  depositosVencidos: number;
  depositosProximosVencer: number;
  valorTotalDepositado: number;
  alertasActivas: number;
}

// ============================================
// DEPOSITO
// ============================================

export type EstadoDeposito = 'activo' | 'proximo_vencimiento' | 'vencido' | 'retirado' | 'facturado';

export interface Deposito {
  _id: string;
  numeroDeposito: string;
  producto: string | Producto;
  emplazamiento: string | Emplazamiento;
  cliente: string | Cliente;
  subcliente?: string | Cliente;
  cantidad: number;
  valorUnitario: number;
  valorTotal: number;
  fechaDeposito: string;
  fechaVencimiento?: string;
  diasHastaVencimiento?: number;
  estado: EstadoDeposito;
  observaciones?: string;
  activo: boolean;

  // Trazabilidad
  tieneTrazabilidad?: boolean;
  codigoLote?: string;
  tipoLote?: 'innerbox' | 'masterbox' | '';
  codigosUnitarios?: string[];

  createdBy: string | User;
  updatedBy?: string | User;
  createdAt: string;
  updatedAt: string;
}

export interface DepositoFormData {
  producto: string;
  cliente: string;
  subcliente?: string;
  emplazamiento: string;
  cantidad: number;
  valorUnitario?: number;
  fechaDeposito?: string;
  fechaVencimiento?: string;
  observaciones?: string;

  // Trazabilidad
  tieneTrazabilidad?: boolean;
  codigoLote?: string;
  tipoLote?: 'innerbox' | 'masterbox' | '';
  codigosUnitarios?: string[];
}

export interface ExtenderPlazoData {
  nuevaFechaVencimiento: string;
  observaciones?: string;
}

export interface DepositoEstadisticas {
  total: number;
  porEstado: {
    activo: number;
    proximo_vencimiento: number;
    vencido: number;
    retirado: number;
    facturado: number;
  };
  valorTotal: number;
  valorPromedio: number;
}

// ============================================
// MOVIMIENTO
// ============================================

export type TipoMovimiento = 'deposito' | 'retiro' | 'ajuste' | 'vencimiento' | 'extension_plazo';

export interface Movimiento {
  _id: string;
  deposito: string | Deposito;
  tipo: TipoMovimiento;
  cantidad: number;
  valorUnitario: number;
  fecha: string;
  descripcion?: string;
  usuario: string | User;
  createdAt: string;
}

// ============================================
// ALERTA
// ============================================

export type TipoAlerta = 'vencimiento_proximo' | 'producto_vencido' | 'stock_bajo' | 'valor_alto' | 'otro';
export type PrioridadAlerta = 'baja' | 'media' | 'alta' | 'critica';

export interface Alerta {
  _id: string;
  tipo: TipoAlerta;
  prioridad: PrioridadAlerta;
  mensaje: string;
  depositoAfectado?: string | Deposito;
  productoAfectado?: string | Producto;
  emplazamientoAfectado?: string | Emplazamiento;
  resuelta: boolean;
  fechaResolucion?: string;
  observaciones?: string;
  createdBy?: string | User;
  createdAt: string;
  updatedAt: string;
}

export interface AlertaFormData {
  tipo: TipoAlerta;
  prioridad: PrioridadAlerta;
  mensaje: string;
  depositoAfectado?: string;
  productoAfectado?: string;
  emplazamientoAfectado?: string;
  observaciones?: string;
}

export interface AlertaEstadisticas {
  total: number;
  porPrioridad: {
    baja: number;
    media: number;
    alta: number;
    critica: number;
  };
  porTipo: {
    vencimiento_proximo: number;
    producto_vencido: number;
    stock_bajo: number;
    valor_alto: number;
    otro: number;
  };
  resueltas: number;
  pendientes: number;
}

// ============================================
// DASHBOARD & KPIs
// ============================================

export interface DashboardKPIs {
  depositos: {
    total: number;
    activos: number;
    proximosVencer: number;
    vencidos: number;
    valorTotal: number;
  };
  clientes: {
    total: number;
    activos: number;
  };
  emplazamientos: {
    total: number;
    activos: number;
    conAlertasCriticas: number;
  };
  alertas: {
    total: number;
    criticas: number;
    altas: number;
    pendientes: number;
  };
  productos: {
    total: number;
    categorias: number;
  };
  tendencia: {
    depositosUltimos7Dias: Array<{
      fecha: string;
      count: number;
      valorTotal: number;
    }>;
    alertasUltimos7Dias: Array<{
      fecha: string;
      count: number;
    }>;
  };
}

export interface AlertaCritica {
  _id: string;
  tipo: TipoAlerta;
  prioridad: PrioridadAlerta;
  mensaje: string;
  depositoAfectado?: {
    _id: string;
    numeroDeposito: string;
    producto: {
      codigo: string;
      nombre: string;
    };
    emplazamiento: {
      nombre: string;
      cliente: {
        nombre: string;
      };
    };
  };
  fechaCreacion: string;
  diasDesdeCreacion: number;
}

// ============================================
// AI MODULE
// ============================================

export interface AIConsulta {
  _id: string;
  usuario: string | User;
  pregunta: string;
  respuesta: string;
  tipo: 'chat' | 'analisis' | 'reporte' | 'optimizacion';
  modelo: string;
  provider: 'openai' | 'anthropic';
  tokensUsados: number;
  costo: number;
  tiempoRespuesta: number;
  utilidad?: number;
  feedback?: string;
  guardado: boolean;
  fecha: string;
  createdAt: string;
}

export interface AIInsight {
  _id: string;
  tipo: 'optimizacion' | 'riesgo' | 'oportunidad' | 'anomalia' | 'recomendacion';
  titulo: string;
  descripcion: string;
  prioridad: 'alta' | 'media' | 'baja';
  accionesRecomendadas?: string[];
  datosRelacionados?: Record<string, any>;
  confianza: number;
  relevancia: number;
  estado: 'activo' | 'visto' | 'descartado' | 'aplicado';
  visto: boolean;
  accionesTomadas?: string[];
  resultado?: string;
  fechaResolucion?: string;
  fecha: string;
  fechaExpiracion?: string;
  valoracion?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AIConfig {
  _id: string;
  proveedor: 'openai' | 'anthropic';
  nombreDisplay: string;
  apiKeyEncrypted: string;
  modelo: string;
  maxTokens: number;
  temperatura: number;
  limiteMensual: number;
  usoMensual: number;
  prioridadUso: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// API RESPONSES
// ============================================

export interface APIResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  message: string;
  data: {
    items: T[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}

export interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  errors?: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

// ============================================
// QUERY PARAMS
// ============================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SearchParams extends PaginationParams {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FiltrosDepositos extends SearchParams {
  producto?: string;
  emplazamiento?: string;
  cliente?: string;
  estado?: EstadoDeposito;
  fechaDesde?: string;
  fechaHasta?: string;
  proximosVencer?: boolean;
}

export interface FiltrosAlertas extends SearchParams {
  tipo?: TipoAlerta;
  prioridad?: PrioridadAlerta;
  resuelta?: boolean;
  deposito?: string;
  emplazamiento?: string;
}

// ============================================
// MAP TYPES
// ============================================

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapCenter {
  lat: number;
  lng: number;
}

export interface MarkerCluster {
  id: string;
  position: MapCenter;
  count: number;
  emplazamientos: string[];
}

// ============================================
// DASHBOARD TYPES (EXTENDED)
// ============================================

/**
 * Tipo extendido de DashboardKPIs con estructura plana para las 8 cards principales
 */
export interface DashboardKPIsExtended {
  // Valores totales
  valorTotalDepositado: number;
  emplazamientosActivos: number;
  depositosActivos: number;
  alertasPendientes: number;

  // Próximos a vencer (<7 días)
  proximosVencer: {
    cantidad: number;
    valorTotal: number;
  };

  // Vencidos
  vencidos: {
    cantidad: number;
    valorTotal: number;
  };

  // Top cliente por valor
  topCliente: {
    nombre: string;
    valorTotal: number;
  };

  // Top producto por cantidad
  topProducto: {
    nombre: string;
    cantidadTotal: number;
  };
}

/**
 * Datos de emplazamiento para el mapa con información completa
 */
export interface EmplazamientoMapData {
  _id: string;
  nombre: string;
  codigo?: string;
  coordenadas: {
    lat: number;
    lng: number;
  };
  cliente: {
    _id: string;
    nombre: string;
  };
  ciudad?: string;
  provincia?: string;
  depositosActivos: number;
  valorTotal: number;
  diasMinimosRestantes?: number;
  estado: 'verde' | 'amarillo' | 'rojo' | 'critico';
}

/**
 * Alerta extendida con todos los campos necesarios para la tabla
 */
export interface AlertaExtended extends Alerta {
  titulo: string;
  descripcion: string;
  valorAfectado: number;
  diasRestantes?: number;
  deposito: string | Deposito;
  cliente?: {
    _id: string;
    nombre: string;
  };
  emplazamiento?: {
    _id: string;
    nombre: string;
  };
}
