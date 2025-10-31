/**
 * AssetFlow 3.0 - Deposito Service
 * Servicio para gestión completa de depósitos con acciones especiales
 */

import apiClient from './api';
import type {
  Deposito,
  DepositoFormData,
  ExtenderPlazoData,
  DepositoEstadisticas,
  EstadoDeposito
} from '../types';

/**
 * Respuesta paginada de depósitos
 */
interface DepositosResponse {
  depositos: Deposito[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Parámetros de filtros para depósitos
 */
interface DepositosFiltros {
  page?: number;
  limit?: number;
  search?: string;
  producto?: string;
  emplazamiento?: string;
  cliente?: string;
  estado?: EstadoDeposito;
  fechaDesde?: string;
  fechaHasta?: string;
  proximosVencer?: boolean;
}

/**
 * Datos para marcar como facturado
 */
interface MarcarFacturadoData {
  referenciaFactura: string;
  observaciones?: string;
}

/**
 * Datos para marcar como devuelto
 */
interface MarcarDevueltoData {
  referenciaAlbaran: string;
  observaciones?: string;
}

/**
 * Servicio de Depósitos con todos los métodos CRUD + acciones especiales
 */
export const depositoService = {
  /**
   * Obtiene todos los depósitos con paginación y filtros
   */
  async getAll(params?: DepositosFiltros): Promise<DepositosResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.search) queryParams.append('search', params.search);
      if (params?.producto) queryParams.append('producto', params.producto);
      if (params?.emplazamiento) queryParams.append('emplazamiento', params.emplazamiento);
      if (params?.cliente) queryParams.append('cliente', params.cliente);
      if (params?.estado) queryParams.append('estado', params.estado);
      if (params?.fechaDesde) queryParams.append('fechaDesde', params.fechaDesde);
      if (params?.fechaHasta) queryParams.append('fechaHasta', params.fechaHasta);
      if (params?.proximosVencer !== undefined) queryParams.append('proximosVencer', params.proximosVencer.toString());

      const url = `/depositos${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const data = await apiClient.get<DepositosResponse>(url);
      return data;
    } catch (error: any) {
      console.error('Error al obtener depósitos:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar depósitos');
    }
  },

  /**
   * Obtiene un depósito por ID
   */
  async getById(id: string): Promise<Deposito> {
    try {
      const data = await apiClient.get<Deposito>(`/depositos/${id}`);
      return data;
    } catch (error: any) {
      console.error('Error al obtener depósito:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar depósito');
    }
  },

  /**
   * Crea un nuevo depósito
   */
  async create(depositoData: DepositoFormData): Promise<Deposito> {
    try {
      const data = await apiClient.post<Deposito>('/depositos', depositoData);
      return data;
    } catch (error: any) {
      console.error('Error al crear depósito:', error);
      throw new Error(error.response?.data?.message || 'Error al crear depósito');
    }
  },

  /**
   * Actualiza un depósito existente
   */
  async update(id: string, depositoData: Partial<DepositoFormData>): Promise<Deposito> {
    try {
      const data = await apiClient.put<Deposito>(`/depositos/${id}`, depositoData);
      return data;
    } catch (error: any) {
      console.error('Error al actualizar depósito:', error);
      throw new Error(error.response?.data?.message || 'Error al actualizar depósito');
    }
  },

  /**
   * Elimina un depósito (soft delete, solo admin)
   */
  async delete(id: string): Promise<Deposito> {
    try {
      const response = await apiClient.delete<{ deposito: Deposito }>(`/depositos/${id}`);
      return response.deposito;
    } catch (error: any) {
      console.error('Error al eliminar depósito:', error);
      throw new Error(error.response?.data?.message || 'Error al eliminar depósito');
    }
  },

  /**
   * Obtiene estadísticas de depósitos
   */
  async getEstadisticas(): Promise<DepositoEstadisticas> {
    try {
      const data = await apiClient.get<DepositoEstadisticas>('/depositos/stats');
      return data;
    } catch (error: any) {
      console.error('Error al obtener estadísticas de depósitos:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar estadísticas');
    }
  },

  /**
   * Busca depósitos por número de depósito
   */
  async search(query: string): Promise<Deposito[]> {
    try {
      const data = await apiClient.get<Deposito[]>(`/depositos/search?q=${encodeURIComponent(query)}`);
      return data;
    } catch (error: any) {
      console.error('Error al buscar depósitos:', error);
      throw new Error(error.response?.data?.message || 'Error al buscar depósitos');
    }
  },

  /**
   * Obtiene solo depósitos activos
   */
  async getActivos(): Promise<Deposito[]> {
    try {
      const response = await this.getAll({ estado: 'activo', limit: 1000 });
      return response.depositos;
    } catch (error: any) {
      console.error('Error al obtener depósitos activos:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar depósitos activos');
    }
  },

  /**
   * Obtiene depósitos próximos a vencer (< 7 días)
   */
  async getProximosVencer(): Promise<Deposito[]> {
    try {
      const response = await this.getAll({ proximosVencer: true, limit: 1000 });
      return response.depositos;
    } catch (error: any) {
      console.error('Error al obtener depósitos próximos a vencer:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar depósitos próximos a vencer');
    }
  },

  /**
   * Obtiene depósitos filtrados por emplazamiento
   */
  async getByEmplazamiento(emplazamientoId: string): Promise<Deposito[]> {
    try {
      const response = await this.getAll({ emplazamiento: emplazamientoId, limit: 1000 });
      return response.depositos;
    } catch (error: any) {
      console.error('Error al obtener depósitos por emplazamiento:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar depósitos del emplazamiento');
    }
  },

  /**
   * Obtiene depósitos filtrados por cliente
   */
  async getByCliente(clienteId: string): Promise<Deposito[]> {
    try {
      const response = await this.getAll({ cliente: clienteId, limit: 1000 });
      return response.depositos;
    } catch (error: any) {
      console.error('Error al obtener depósitos por cliente:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar depósitos del cliente');
    }
  },

  /**
   * Obtiene depósitos filtrados por producto
   */
  async getByProducto(productoId: string): Promise<Deposito[]> {
    try {
      const response = await this.getAll({ producto: productoId, limit: 1000 });
      return response.depositos;
    } catch (error: any) {
      console.error('Error al obtener depósitos por producto:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar depósitos del producto');
    }
  },

  // ============================================
  // ACCIONES ESPECIALES SOBRE DEPÓSITOS
  // ============================================

  /**
   * Extiende el plazo de un depósito
   * Modal con nueva fecha límite + justificación
   * Registra movimiento tipo "extension_plazo"
   * Recalcula alertas
   */
  async extenderPlazo(id: string, data: ExtenderPlazoData): Promise<Deposito> {
    try {
      const result = await apiClient.post<Deposito>(`/depositos/${id}/extender-plazo`, data);
      return result;
    } catch (error: any) {
      console.error('Error al extender plazo del depósito:', error);
      throw new Error(error.response?.data?.message || 'Error al extender plazo del depósito');
    }
  },

  /**
   * Marca un depósito como facturado
   * Modal con referencia de factura
   * Cambia estado a "facturado"
   * Registra movimiento de salida
   * NO elimina el depósito (mantener histórico)
   */
  async marcarFacturado(id: string, data: MarcarFacturadoData): Promise<Deposito> {
    try {
      const result = await apiClient.post<Deposito>(`/depositos/${id}/marcar-facturado`, data);
      return result;
    } catch (error: any) {
      console.error('Error al marcar depósito como facturado:', error);
      throw new Error(error.response?.data?.message || 'Error al marcar depósito como facturado');
    }
  },

  /**
   * Marca un depósito como devuelto
   * Modal con referencia de albarán devolución
   * Cambia estado a "devuelto"
   * Registra movimiento de salida
   * NO elimina el depósito
   */
  async marcarDevuelto(id: string, data: MarcarDevueltoData): Promise<Deposito> {
    try {
      const result = await apiClient.post<Deposito>(`/depositos/${id}/marcar-devuelto`, data);
      return result;
    } catch (error: any) {
      console.error('Error al marcar depósito como devuelto:', error);
      throw new Error(error.response?.data?.message || 'Error al marcar depósito como devuelto');
    }
  },

  // ============================================
  // TRAZABILIDAD - CÓDIGOS UNITARIOS
  // ============================================

  /**
   * Busca un depósito por código unitario
   */
  async buscarPorCodigoUnitario(codigo: string): Promise<Deposito> {
    try {
      const data = await apiClient.get<{ deposito: Deposito }>(`/depositos/buscar-codigo/${encodeURIComponent(codigo)}`);
      return data.deposito;
    } catch (error: any) {
      console.error('Error al buscar por código unitario:', error);
      throw new Error(error.response?.data?.message || 'No se encontró ningún depósito con ese código');
    }
  },

  /**
   * Añade códigos unitarios a un depósito
   */
  async agregarCodigosUnitarios(id: string, codigos: string[]): Promise<{ deposito: Deposito; codigosNuevos: number; conflictos: any[] }> {
    try {
      const data = await apiClient.post<{ deposito: Deposito; codigosNuevos: number; conflictos: any[] }>(`/depositos/${id}/codigos`, { codigos });
      return data;
    } catch (error: any) {
      console.error('Error al agregar códigos unitarios:', error);
      throw new Error(error.response?.data?.message || 'Error al agregar códigos unitarios');
    }
  },

  /**
   * Importa códigos unitarios desde CSV
   */
  async importarCodigosCSV(id: string, csvContent: string): Promise<{ deposito: Deposito; codigosNuevos: number; conflictos: any[] }> {
    try {
      const data = await apiClient.post<{ deposito: Deposito; codigosNuevos: number; conflictos: any[] }>(`/depositos/${id}/importar-codigos`, { csvContent });
      return data;
    } catch (error: any) {
      console.error('Error al importar códigos desde CSV:', error);
      throw new Error(error.response?.data?.message || 'Error al importar códigos desde CSV');
    }
  }
};

export default depositoService;
