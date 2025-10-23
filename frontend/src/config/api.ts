/**
 * AssetFlow 3.0 - API Configuration
 * Centralized API endpoint configuration
 */

const isDevelopment = import.meta.env.MODE === 'development';

export const API_CONFIG = {
  BASE_URL: isDevelopment
    ? 'http://localhost:5000/api'
    : import.meta.env.VITE_API_URL || '/api',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    UPDATE_ME: '/auth/me',
    CHANGE_PASSWORD: '/auth/change-password',
  },

  // Productos
  PRODUCTOS: {
    BASE: '/productos',
    BY_ID: (id: string) => `/productos/${id}`,
    CATEGORIAS: '/productos/categorias',
    SEARCH: '/productos/search',
  },

  // Clientes
  CLIENTES: {
    BASE: '/clientes',
    BY_ID: (id: string) => `/clientes/${id}`,
    ESTADISTICAS: (id: string) => `/clientes/${id}/estadisticas`,
  },

  // Emplazamientos
  EMPLAZAMIENTOS: {
    BASE: '/emplazamientos',
    BY_ID: (id: string) => `/emplazamientos/${id}`,
    CERCANOS: '/emplazamientos/cercanos',
    PARA_MAPA: '/emplazamientos/para-mapa',
    ESTADISTICAS: (id: string) => `/emplazamientos/${id}/estadisticas`,
  },

  // Depósitos
  DEPOSITOS: {
    BASE: '/depositos',
    BY_ID: (id: string) => `/depositos/${id}`,
    PROXIMOS_VENCER: '/depositos/proximos-vencer',
    VENCIDOS: '/depositos/vencidos',
    ESTADISTICAS: '/depositos/estadisticas',
    EXTENDER_PLAZO: (id: string) => `/depositos/${id}/extender-plazo`,
    MARCAR_FACTURADO: (id: string) => `/depositos/${id}/facturado`,
    MARCAR_RETIRADO: (id: string) => `/depositos/${id}/retirado`,
  },

  // Alertas
  ALERTAS: {
    BASE: '/alertas',
    BY_ID: (id: string) => `/alertas/${id}`,
    ACTIVAS: '/alertas/activas',
    CRITICAS: '/alertas/criticas',
    POR_PRIORIDAD: '/alertas/por-prioridad',
    ESTADISTICAS: '/alertas/estadisticas',
    RESOLVER: (id: string) => `/alertas/${id}/resolver`,
    RESOLVER_MULTIPLES: '/alertas/resolver-multiples',
    GENERAR_AUTOMATICAS: '/alertas/generar-automaticas',
  },

  // Dashboard
  DASHBOARD: {
    KPIS: '/dashboard/kpis',
    MAPA: '/dashboard/mapa',
    ALERTAS_CRITICAS: '/dashboard/alertas-criticas',
    RESUMEN_EJECUTIVO: '/dashboard/resumen-ejecutivo',
    POR_CLIENTE: (clienteId: string) => `/dashboard/por-cliente/${clienteId}`,
    POR_EMPLAZAMIENTO: (emplazamientoId: string) => `/dashboard/por-emplazamiento/${emplazamientoId}`,
  },

  // AI Module (future implementation)
  AI: {
    CONSULTAS: '/ai/consultas',
    INSIGHTS: '/ai/insights',
    CHAT: '/ai/chat',
    CONFIG: '/ai/config',
  },
};

export default API_CONFIG;
