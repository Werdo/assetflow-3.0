/**
 * AssetFlow 3.0 - Alerta Service
 * Servicio para gestión completa de alertas del sistema
 */

import apiClient from './api';
import type { Alerta, AlertaFormData } from '../types';

/**
 * Respuesta paginada de alertas
 */
interface AlertasResponse {
  alertas: Alerta[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Parámetros de filtros para alertas
 */
interface AlertasFiltros {
  page?: number;
  limit?: number;
  tipo?: string;
  prioridad?: string;
  resuelta?: boolean;
  depositoAfectado?: string;
  desde?: string;
  hasta?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

/**
 * Datos para resolver alerta
 */
interface ResolverAlertaData {
  observaciones?: string;
}

/**
 * Datos para resolver múltiples alertas
 */
interface ResolverMultiplesData {
  alertaIds: string[];
  observaciones?: string;
}

/**
 * Servicio de Alertas con todos los métodos CRUD + acciones especiales
 */
export const alertaService = {
  /**
   * Obtiene todas las alertas con paginación y filtros
   */
  async getAll(params?: AlertasFiltros): Promise<AlertasResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.tipo) queryParams.append('tipo', params.tipo);
      if (params?.prioridad) queryParams.append('prioridad', params.prioridad);
      if (params?.resuelta !== undefined) queryParams.append('resuelta', params.resuelta.toString());
      if (params?.depositoAfectado) queryParams.append('depositoAfectado', params.depositoAfectado);
      if (params?.desde) queryParams.append('desde', params.desde);
      if (params?.hasta) queryParams.append('hasta', params.hasta);
      if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params?.order) queryParams.append('order', params.order);

      const url = `/alertas${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const data = await apiClient.get<AlertasResponse>(url);
      return data;
    } catch (error: any) {
      console.error('Error al obtener alertas:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar alertas');
    }
  },

  /**
   * Obtiene una alerta por ID
   */
  async getById(id: string): Promise<Alerta> {
    try {
      const data = await apiClient.get<Alerta>(`/alertas/${id}`);
      return data;
    } catch (error: any) {
      console.error('Error al obtener alerta:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar alerta');
    }
  },

  /**
   * Crea una nueva alerta manual
   */
  async create(alertaData: AlertaFormData): Promise<Alerta> {
    try {
      const data = await apiClient.post<Alerta>('/alertas', alertaData);
      return data;
    } catch (error: any) {
      console.error('Error al crear alerta:', error);
      throw new Error(error.response?.data?.message || 'Error al crear alerta');
    }
  },

  /**
   * Marca una alerta como resuelta
   */
  async resolver(id: string, data: ResolverAlertaData): Promise<Alerta> {
    try {
      const result = await apiClient.put<Alerta>(`/alertas/${id}/resolver`, data);
      return result;
    } catch (error: any) {
      console.error('Error al resolver alerta:', error);
      throw new Error(error.response?.data?.message || 'Error al resolver alerta');
    }
  },

  /**
   * Elimina una alerta (solo admin)
   */
  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(`/alertas/${id}`);
    } catch (error: any) {
      console.error('Error al eliminar alerta:', error);
      throw new Error(error.response?.data?.message || 'Error al eliminar alerta');
    }
  },

  /**
   * Obtiene alertas activas (no resueltas)
   */
  async getActivas(params?: { prioridad?: string; tipo?: string; page?: number; limit?: number }): Promise<AlertasResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params?.prioridad) queryParams.append('prioridad', params.prioridad);
      if (params?.tipo) queryParams.append('tipo', params.tipo);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const url = `/alertas/activas/list${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const data = await apiClient.get<AlertasResponse>(url);
      return data;
    } catch (error: any) {
      console.error('Error al obtener alertas activas:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar alertas activas');
    }
  },

  /**
   * Obtiene alertas críticas (prioridad alta)
   */
  async getCriticas(params?: { page?: number; limit?: number }): Promise<AlertasResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const url = `/alertas/criticas/list${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const data = await apiClient.get<AlertasResponse>(url);
      return data;
    } catch (error: any) {
      console.error('Error al obtener alertas críticas:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar alertas críticas');
    }
  },

  /**
   * Obtiene alertas por prioridad
   */
  async getByPrioridad(prioridad: string, params?: { page?: number; limit?: number }): Promise<AlertasResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const url = `/alertas/prioridad/${prioridad}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const data = await apiClient.get<AlertasResponse>(url);
      return data;
    } catch (error: any) {
      console.error('Error al obtener alertas por prioridad:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar alertas por prioridad');
    }
  },

  /**
   * Obtiene estadísticas de alertas
   */
  async getEstadisticas(params?: { desde?: string; hasta?: string }): Promise<any> {
    try {
      const queryParams = new URLSearchParams();

      if (params?.desde) queryParams.append('desde', params.desde);
      if (params?.hasta) queryParams.append('hasta', params.hasta);

      const url = `/alertas/estadisticas/general${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const data = await apiClient.get<any>(url);
      return data;
    } catch (error: any) {
      console.error('Error al obtener estadísticas de alertas:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar estadísticas');
    }
  },

  /**
   * Genera alertas automáticas para todos los depósitos
   */
  async generarAutomaticas(): Promise<any> {
    try {
      const data = await apiClient.post<any>('/alertas/generar-automaticas');
      return data;
    } catch (error: any) {
      console.error('Error al generar alertas automáticas:', error);
      throw new Error(error.response?.data?.message || 'Error al generar alertas automáticas');
    }
  },

  /**
   * Resuelve múltiples alertas de una vez
   */
  async resolverMultiples(data: ResolverMultiplesData): Promise<any> {
    try {
      const result = await apiClient.put<any>('/alertas/resolver-multiples', data);
      return result;
    } catch (error: any) {
      console.error('Error al resolver múltiples alertas:', error);
      throw new Error(error.response?.data?.message || 'Error al resolver alertas');
    }
  },
};

export default alertaService;
