/**
 * AssetFlow 3.0 - Producto Service
 * Servicio para gestión completa de productos
 */

import apiClient from './api';
import type { Producto, ProductoFormData } from '../types';

/**
 * Respuesta paginada de productos
 */
interface ProductosResponse {
  productos: Producto[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Estadísticas de productos
 */
interface ProductoStats {
  totalProductos: number;
  productosActivos: number;
  productosInactivos: number;
  categorias: string[];
  valorTotalInventario: number;
}

/**
 * Servicio de Productos con todos los métodos CRUD
 */
export const productoService = {
  /**
   * Obtiene todos los productos con paginación y filtros
   */
  async getAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    categoria?: string;
    activo?: boolean;
  }): Promise<ProductosResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.search) queryParams.append('search', params.search);
      if (params?.categoria) queryParams.append('categoria', params.categoria);
      if (params?.activo !== undefined) queryParams.append('activo', params.activo.toString());

      const url = `/productos${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const data = await apiClient.get<ProductosResponse>(url);
      return data;
    } catch (error: any) {
      console.error('Error al obtener productos:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar productos');
    }
  },

  /**
   * Obtiene un producto por ID
   */
  async getById(id: string): Promise<Producto> {
    try {
      const data = await apiClient.get<Producto>(`/productos/${id}`);
      return data;
    } catch (error: any) {
      console.error('Error al obtener producto:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar producto');
    }
  },

  /**
   * Crea un nuevo producto
   */
  async create(productoData: ProductoFormData): Promise<Producto> {
    try {
      const data = await apiClient.post<Producto>('/productos', productoData);
      return data;
    } catch (error: any) {
      console.error('Error al crear producto:', error);
      throw new Error(error.response?.data?.message || 'Error al crear producto');
    }
  },

  /**
   * Actualiza un producto existente
   */
  async update(id: string, productoData: Partial<ProductoFormData>): Promise<Producto> {
    try {
      const data = await apiClient.put<Producto>(`/productos/${id}`, productoData);
      return data;
    } catch (error: any) {
      console.error('Error al actualizar producto:', error);
      throw new Error(error.response?.data?.message || 'Error al actualizar producto');
    }
  },

  /**
   * Elimina un producto (soft delete)
   */
  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(`/productos/${id}`);
    } catch (error: any) {
      console.error('Error al eliminar producto:', error);
      throw new Error(error.response?.data?.message || 'Error al eliminar producto');
    }
  },

  /**
   * Activa/desactiva un producto
   */
  async toggleActivo(id: string, activo: boolean): Promise<Producto> {
    try {
      const data = await apiClient.put<Producto>(`/productos/${id}`, { activo });
      return data;
    } catch (error: any) {
      console.error('Error al cambiar estado del producto:', error);
      throw new Error(error.response?.data?.message || 'Error al cambiar estado del producto');
    }
  },

  /**
   * Obtiene todas las categorías únicas
   */
  async getCategorias(): Promise<string[]> {
    try {
      const data = await apiClient.get<string[]>('/productos/categorias');
      return data;
    } catch (error: any) {
      console.error('Error al obtener categorías:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar categorías');
    }
  },

  /**
   * Obtiene estadísticas de productos
   */
  async getStats(): Promise<ProductoStats> {
    try {
      const data = await apiClient.get<ProductoStats>('/productos/stats');
      return data;
    } catch (error: any) {
      console.error('Error al obtener estadísticas de productos:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar estadísticas');
    }
  },

  /**
   * Busca productos por código o nombre
   */
  async search(query: string): Promise<Producto[]> {
    try {
      const data = await apiClient.get<Producto[]>(`/productos/search?q=${encodeURIComponent(query)}`);
      return data;
    } catch (error: any) {
      console.error('Error al buscar productos:', error);
      throw new Error(error.response?.data?.message || 'Error al buscar productos');
    }
  },

  /**
   * Obtiene solo productos activos (para selects)
   */
  async getActivos(): Promise<Producto[]> {
    try {
      const response = await this.getAll({ activo: true, limit: 1000 });
      return response.productos;
    } catch (error: any) {
      console.error('Error al obtener productos activos:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar productos activos');
    }
  },
};

export default productoService;
