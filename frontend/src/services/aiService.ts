/**
 * AssetFlow 3.0 - AI Service
 * Servicio para integración con módulo de IA (OpenAI + Anthropic)
 */

import apiClient from './api';
import type { AIConfig, AIConsulta, AIInsight } from '../types';

/**
 * Respuesta de configuración de IA
 */
interface AIConfigResponse {
  configs: AIConfig[];
}

/**
 * Datos para crear/actualizar configuración de IA
 */
interface AIConfigFormData {
  proveedor: 'openai' | 'anthropic';
  nombreDisplay: string;
  apiKey: string;
  modelo: string;
  maxTokens?: number;
  temperatura?: number;
  limiteMensual?: number;
  prioridadUso?: number;
  activo?: boolean;
}

/**
 * Mensaje de chat
 */
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Respuesta de chat
 */
interface ChatResponse {
  respuesta: string;
  consulta: AIConsulta;
}

/**
 * Respuesta de análisis predictivo
 */
interface AnalisisVencimientosResponse {
  riesgos: Array<{
    deposito: string;
    riesgo: number;
    razon: string;
    accion: string;
  }>;
  recomendaciones: string[];
}

/**
 * Respuesta de optimización
 */
interface OptimizacionResponse {
  oportunidades: Array<{
    titulo: string;
    impacto: string;
    accion: string;
  }>;
}

/**
 * Respuesta de reporte ejecutivo
 */
interface ReporteEjecutivoResponse {
  resumenEjecutivo: string;
  kpis: Record<string, any>;
  insights: string[];
  riesgos: string[];
  recomendaciones: string[];
  html: string;
  pdf?: string;
}

/**
 * Respuesta de insights
 */
interface InsightsResponse {
  insights: AIInsight[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Respuesta de historial
 */
interface HistorialResponse {
  consultas: AIConsulta[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Servicio de IA con todos los métodos
 */
export const aiService = {
  // ===== CONFIGURACIÓN =====

  /**
   * Obtiene todas las configuraciones de IA
   */
  async getConfigs(): Promise<AIConfig[]> {
    try {
      const data = await apiClient.get<AIConfigResponse>('/ia/config');
      return data.configs;
    } catch (error: any) {
      console.error('Error al obtener configuraciones IA:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar configuraciones de IA');
    }
  },

  /**
   * Obtiene una configuración por ID
   */
  async getConfig(id: string): Promise<AIConfig> {
    try {
      const data = await apiClient.get<AIConfig>(`/ia/config/${id}`);
      return data;
    } catch (error: any) {
      console.error('Error al obtener configuración IA:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar configuración');
    }
  },

  /**
   * Crea una nueva configuración de IA
   */
  async createConfig(configData: AIConfigFormData): Promise<AIConfig> {
    try {
      const data = await apiClient.post<AIConfig>('/ia/config', configData);
      return data;
    } catch (error: any) {
      console.error('Error al crear configuración IA:', error);
      throw new Error(error.response?.data?.message || 'Error al crear configuración');
    }
  },

  /**
   * Actualiza una configuración de IA
   */
  async updateConfig(id: string, configData: Partial<AIConfigFormData>): Promise<AIConfig> {
    try {
      const data = await apiClient.put<AIConfig>(`/ia/config/${id}`, configData);
      return data;
    } catch (error: any) {
      console.error('Error al actualizar configuración IA:', error);
      throw new Error(error.response?.data?.message || 'Error al actualizar configuración');
    }
  },

  /**
   * Elimina una configuración de IA
   */
  async deleteConfig(id: string): Promise<void> {
    try {
      await apiClient.delete(`/ia/config/${id}`);
    } catch (error: any) {
      console.error('Error al eliminar configuración IA:', error);
      throw new Error(error.response?.data?.message || 'Error al eliminar configuración');
    }
  },

  // ===== CHAT =====

  /**
   * Envía un mensaje al chat de IA
   */
  async chat(mensaje: string, historial?: ChatMessage[]): Promise<ChatResponse> {
    try {
      const data = await apiClient.post<ChatResponse>('/ia/chat', { mensaje, historial });
      return data;
    } catch (error: any) {
      console.error('Error en chat IA:', error);
      throw new Error(error.response?.data?.message || 'Error al comunicarse con la IA');
    }
  },

  // ===== ANÁLISIS =====

  /**
   * Ejecuta análisis predictivo de vencimientos
   */
  async analizarVencimientos(): Promise<AnalisisVencimientosResponse> {
    try {
      const data = await apiClient.post<AnalisisVencimientosResponse>('/ia/analizar/vencimientos');
      return data;
    } catch (error: any) {
      console.error('Error al analizar vencimientos:', error);
      throw new Error(error.response?.data?.message || 'Error al analizar vencimientos');
    }
  },

  /**
   * Ejecuta optimización de depósitos
   */
  async optimizarDepositos(): Promise<OptimizacionResponse> {
    try {
      const data = await apiClient.post<OptimizacionResponse>('/ia/optimizar/depositos');
      return data;
    } catch (error: any) {
      console.error('Error al optimizar depósitos:', error);
      throw new Error(error.response?.data?.message || 'Error al optimizar depósitos');
    }
  },

  /**
   * Genera reporte ejecutivo para un periodo
   */
  async generarReporte(periodo: string): Promise<ReporteEjecutivoResponse> {
    try {
      const data = await apiClient.post<ReporteEjecutivoResponse>(`/ia/generar-reporte/${periodo}`);
      return data;
    } catch (error: any) {
      console.error('Error al generar reporte:', error);
      throw new Error(error.response?.data?.message || 'Error al generar reporte');
    }
  },

  // ===== INSIGHTS =====

  /**
   * Obtiene todos los insights con filtros
   */
  async getInsights(params?: {
    tipo?: string;
    estado?: string;
    prioridad?: string;
    page?: number;
    limit?: number;
  }): Promise<InsightsResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params?.tipo) queryParams.append('tipo', params.tipo);
      if (params?.estado) queryParams.append('estado', params.estado);
      if (params?.prioridad) queryParams.append('prioridad', params.prioridad);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const url = `/ia/insights${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const data = await apiClient.get<InsightsResponse>(url);
      return data;
    } catch (error: any) {
      console.error('Error al obtener insights:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar insights');
    }
  },

  /**
   * Obtiene un insight por ID
   */
  async getInsight(id: string): Promise<AIInsight> {
    try {
      const data = await apiClient.get<AIInsight>(`/ia/insights/${id}`);
      return data;
    } catch (error: any) {
      console.error('Error al obtener insight:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar insight');
    }
  },

  /**
   * Genera insights automáticamente
   */
  async generarInsights(): Promise<{ generados: number; insights: AIInsight[] }> {
    try {
      const data = await apiClient.post<{ generados: number; insights: AIInsight[] }>('/ia/insights/generar');
      return data;
    } catch (error: any) {
      console.error('Error al generar insights:', error);
      throw new Error(error.response?.data?.message || 'Error al generar insights');
    }
  },

  /**
   * Resuelve un insight
   */
  async resolverInsight(id: string, datos: {
    accionesTomadas: string[];
    resultado?: string;
  }): Promise<AIInsight> {
    try {
      const data = await apiClient.post<AIInsight>(`/ia/insights/${id}/resolver`, datos);
      return data;
    } catch (error: any) {
      console.error('Error al resolver insight:', error);
      throw new Error(error.response?.data?.message || 'Error al resolver insight');
    }
  },

  /**
   * Descarta un insight
   */
  async descartarInsight(id: string): Promise<AIInsight> {
    try {
      const data = await apiClient.post<AIInsight>(`/ia/insights/${id}/descartar`);
      return data;
    } catch (error: any) {
      console.error('Error al descartar insight:', error);
      throw new Error(error.response?.data?.message || 'Error al descartar insight');
    }
  },

  /**
   * Marca un insight como visto
   */
  async marcarVisto(id: string): Promise<AIInsight> {
    try {
      const data = await apiClient.post<AIInsight>(`/ia/insights/${id}/visto`);
      return data;
    } catch (error: any) {
      console.error('Error al marcar insight como visto:', error);
      throw new Error(error.response?.data?.message || 'Error al marcar como visto');
    }
  },

  // ===== HISTORIAL =====

  /**
   * Obtiene historial de consultas del usuario
   */
  async getHistorial(params?: {
    tipo?: string;
    guardado?: boolean;
    page?: number;
    limit?: number;
  }): Promise<HistorialResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params?.tipo) queryParams.append('tipo', params.tipo);
      if (params?.guardado !== undefined) queryParams.append('guardado', params.guardado.toString());
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const url = `/ia/historial${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const data = await apiClient.get<HistorialResponse>(url);
      return data;
    } catch (error: any) {
      console.error('Error al obtener historial:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar historial');
    }
  },

  /**
   * Guarda una consulta en favoritos
   */
  async guardarConsulta(id: string): Promise<AIConsulta> {
    try {
      const data = await apiClient.post<AIConsulta>(`/ia/historial/${id}/guardar`);
      return data;
    } catch (error: any) {
      console.error('Error al guardar consulta:', error);
      throw new Error(error.response?.data?.message || 'Error al guardar consulta');
    }
  },

  /**
   * Valora una consulta (1-5 estrellas)
   */
  async valorarConsulta(id: string, utilidad: number, feedback?: string): Promise<AIConsulta> {
    try {
      const data = await apiClient.post<AIConsulta>(`/ia/historial/${id}/valorar`, {
        utilidad,
        feedback
      });
      return data;
    } catch (error: any) {
      console.error('Error al valorar consulta:', error);
      throw new Error(error.response?.data?.message || 'Error al valorar consulta');
    }
  },
};

export default aiService;
