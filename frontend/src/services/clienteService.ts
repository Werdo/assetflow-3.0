/**
 * AssetFlow 3.0 - Cliente Service
 * Servicio para gestión completa de clientes
 */

import apiClient from './api';
import type { Cliente, ClienteFormData } from '../types';

/**
 * Respuesta paginada de clientes
 */
interface ClientesResponse {
  clientes: Cliente[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Estadísticas de clientes
 */
interface ClienteStats {
  totalClientes: number;
  clientesActivos: number;
  clientesInactivos: number;
  valorTotalDepositado: number;
  clienteConMasValor: {
    _id: string;
    nombre: string;
    valorTotal: number;
  } | null;
}

/**
 * Servicio de Clientes con todos los métodos CRUD
 */
export const clienteService = {
  /**
   * Obtiene todos los clientes con paginación y filtros
   */
  async getAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    activo?: boolean;
  }): Promise<ClientesResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.search) queryParams.append('search', params.search);
      if (params?.activo !== undefined) queryParams.append('activo', params.activo.toString());

      const url = `/clientes${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const data = await apiClient.get<ClientesResponse>(url);
      return data;
    } catch (error: any) {
      console.error('Error al obtener clientes:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar clientes');
    }
  },

  /**
   * Obtiene un cliente por ID
   */
  async getById(id: string): Promise<Cliente> {
    try {
      const data = await apiClient.get<Cliente>(`/clientes/${id}`);
      return data;
    } catch (error: any) {
      console.error('Error al obtener cliente:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar cliente');
    }
  },

  /**
   * Crea un nuevo cliente
   */
  async create(clienteData: ClienteFormData): Promise<Cliente> {
    try {
      const data = await apiClient.post<Cliente>('/clientes', clienteData);
      return data;
    } catch (error: any) {
      console.error('Error al crear cliente:', error);
      throw new Error(error.response?.data?.message || 'Error al crear cliente');
    }
  },

  /**
   * Actualiza un cliente existente
   */
  async update(id: string, clienteData: Partial<ClienteFormData>): Promise<Cliente> {
    try {
      const data = await apiClient.put<Cliente>(`/clientes/${id}`, clienteData);
      return data;
    } catch (error: any) {
      console.error('Error al actualizar cliente:', error);
      throw new Error(error.response?.data?.message || 'Error al actualizar cliente');
    }
  },

  /**
   * Elimina un cliente (soft delete)
   */
  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(`/clientes/${id}`);
    } catch (error: any) {
      console.error('Error al eliminar cliente:', error);
      throw new Error(error.response?.data?.message || 'Error al eliminar cliente');
    }
  },

  /**
   * Activa/desactiva un cliente
   */
  async toggleActivo(id: string, activo: boolean): Promise<Cliente> {
    try {
      const data = await apiClient.put<Cliente>(`/clientes/${id}`, { activo });
      return data;
    } catch (error: any) {
      console.error('Error al cambiar estado del cliente:', error);
      throw new Error(error.response?.data?.message || 'Error al cambiar estado del cliente');
    }
  },

  /**
   * Obtiene estadísticas de clientes
   */
  async getStats(): Promise<ClienteStats> {
    try {
      const data = await apiClient.get<ClienteStats>('/clientes/stats');
      return data;
    } catch (error: any) {
      console.error('Error al obtener estadísticas de clientes:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar estadísticas');
    }
  },

  /**
   * Busca clientes por código, nombre o CIF
   */
  async search(query: string): Promise<Cliente[]> {
    try {
      const data = await apiClient.get<Cliente[]>(`/clientes/search?q=${encodeURIComponent(query)}`);
      return data;
    } catch (error: any) {
      console.error('Error al buscar clientes:', error);
      throw new Error(error.response?.data?.message || 'Error al buscar clientes');
    }
  },

  /**
   * Obtiene solo clientes activos (para selects)
   */
  async getActivos(): Promise<Cliente[]> {
    try {
      const response = await this.getAll({ activo: true, limit: 1000 });
      return response.clientes;
    } catch (error: any) {
      console.error('Error al obtener clientes activos:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar clientes activos');
    }
  },
};

export default clienteService;
