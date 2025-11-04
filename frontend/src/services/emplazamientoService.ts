/**
 * AssetFlow 3.0 - Emplazamiento Service
 * Servicio para gestión completa de emplazamientos con geocoding
 */

import apiClient from './api';
import type { Emplazamiento, EmplazamientoFormData, EmplazamientoEstadisticas } from '../types';

/**
 * Respuesta paginada de emplazamientos
 */
interface EmplazamientosResponse {
  emplazamientos: Emplazamiento[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Coordenadas para geocoding
 */
interface GeocodeResult {
  lat: number;
  lng: number;
  direccionCompleta: string;
}

/**
 * Servicio de Emplazamientos con todos los métodos CRUD + geocoding
 */
export const emplazamientoService = {
  /**
   * Obtiene todos los emplazamientos con paginación y filtros
   */
  async getAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    cliente?: string;
    estado?: 'activo' | 'inactivo';
    tipoAlmacen?: string;
  }): Promise<EmplazamientosResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.search) queryParams.append('search', params.search);
      if (params?.cliente) queryParams.append('cliente', params.cliente);
      if (params?.estado) queryParams.append('estado', params.estado);
      if (params?.tipoAlmacen) queryParams.append('tipoAlmacen', params.tipoAlmacen);

      const url = `/emplazamientos${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const data = await apiClient.get<EmplazamientosResponse>(url);
      return data;
    } catch (error: any) {
      console.error('Error al obtener emplazamientos:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar emplazamientos');
    }
  },

  /**
   * Obtiene un emplazamiento por ID
   */
  async getById(id: string): Promise<Emplazamiento> {
    try {
      const data = await apiClient.get<Emplazamiento>(`/emplazamientos/${id}`);
      return data;
    } catch (error: any) {
      console.error('Error al obtener emplazamiento:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar emplazamiento');
    }
  },

  /**
   * Crea un nuevo emplazamiento
   */
  async create(emplazamientoData: EmplazamientoFormData): Promise<Emplazamiento> {
    try {
      // Transformar coordenadas de frontend { lat, lng } a backend GeoJSON { coordinates: [lng, lat] }
      const dataParaBackend = {
        ...emplazamientoData,
        coordenadas: {
          type: 'Point',
          coordinates: [emplazamientoData.coordenadas.lng, emplazamientoData.coordenadas.lat]
        }
      };

      const data = await apiClient.post<Emplazamiento>('/emplazamientos', dataParaBackend);
      return data;
    } catch (error: any) {
      console.error('Error al crear emplazamiento:', error);
      throw new Error(error.response?.data?.message || 'Error al crear emplazamiento');
    }
  },

  /**
   * Actualiza un emplazamiento existente
   */
  async update(id: string, emplazamientoData: Partial<EmplazamientoFormData>): Promise<Emplazamiento> {
    try {
      // Si incluye coordenadas, transformarlas al formato GeoJSON
      const dataParaBackend = emplazamientoData.coordenadas
        ? {
            ...emplazamientoData,
            coordenadas: {
              type: 'Point',
              coordinates: [emplazamientoData.coordenadas.lng, emplazamientoData.coordenadas.lat]
            }
          }
        : emplazamientoData;

      const data = await apiClient.put<Emplazamiento>(`/emplazamientos/${id}`, dataParaBackend);
      return data;
    } catch (error: any) {
      console.error('Error al actualizar emplazamiento:', error);
      throw new Error(error.response?.data?.message || 'Error al actualizar emplazamiento');
    }
  },

  /**
   * Elimina un emplazamiento (soft delete)
   */
  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(`/emplazamientos/${id}`);
    } catch (error: any) {
      console.error('Error al eliminar emplazamiento:', error);
      throw new Error(error.response?.data?.message || 'Error al eliminar emplazamiento');
    }
  },

  /**
   * Cambia el estado de un emplazamiento (activo/inactivo)
   */
  async toggleEstado(id: string, estado: 'activo' | 'inactivo'): Promise<Emplazamiento> {
    try {
      const data = await apiClient.put<Emplazamiento>(`/emplazamientos/${id}`, { estado });
      return data;
    } catch (error: any) {
      console.error('Error al cambiar estado del emplazamiento:', error);
      throw new Error(error.response?.data?.message || 'Error al cambiar estado del emplazamiento');
    }
  },

  /**
   * Obtiene un emplazamiento por ID con estadísticas incluidas
   * El endpoint /emplazamientos/:id ya devuelve estadísticas
   */
  async getWithStats(id: string): Promise<{ emplazamiento: Emplazamiento; estadisticas: EmplazamientoEstadisticas }> {
    try {
      const data = await apiClient.get<{ emplazamiento: Emplazamiento; estadisticas: EmplazamientoEstadisticas }>(`/emplazamientos/${id}`);
      return data;
    } catch (error: any) {
      console.error('Error al obtener emplazamiento con estadísticas:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar emplazamiento');
    }
  },

  /**
   * Obtiene estadísticas de un emplazamiento
   * @deprecated Use getWithStats() en su lugar, ya que el endpoint /:id incluye estadísticas
   */
  async getEstadisticas(id: string): Promise<EmplazamientoEstadisticas> {
    try {
      // Usar el mismo endpoint que getWithStats y extraer solo estadísticas
      const data = await this.getWithStats(id);
      return data.estadisticas;
    } catch (error: any) {
      console.error('Error al obtener estadísticas de emplazamiento:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar estadísticas');
    }
  },

  /**
   * Busca emplazamientos por nombre, código o ciudad
   */
  async search(query: string): Promise<Emplazamiento[]> {
    try {
      const data = await apiClient.get<Emplazamiento[]>(`/emplazamientos/search?q=${encodeURIComponent(query)}`);
      return data;
    } catch (error: any) {
      console.error('Error al buscar emplazamientos:', error);
      throw new Error(error.response?.data?.message || 'Error al buscar emplazamientos');
    }
  },

  /**
   * Obtiene solo emplazamientos activos (para selects)
   */
  async getActivos(): Promise<Emplazamiento[]> {
    try {
      const response = await this.getAll({ estado: 'activo', limit: 1000 });
      return response.emplazamientos;
    } catch (error: any) {
      console.error('Error al obtener emplazamientos activos:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar emplazamientos activos');
    }
  },

  /**
   * Obtiene emplazamientos filtrados por cliente
   */
  async getByCliente(clienteId: string): Promise<Emplazamiento[]> {
    try {
      const response = await this.getAll({ cliente: clienteId, limit: 1000 });
      return response.emplazamientos;
    } catch (error: any) {
      console.error('Error al obtener emplazamientos por cliente:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar emplazamientos del cliente');
    }
  },

  /**
   * Geocoding: Convierte dirección en coordenadas usando OpenStreetMap Nominatim
   * Este es un servicio gratuito, no requiere API key
   */
  async geocode(direccion: string, ciudad: string, provincia?: string, pais: string = 'España'): Promise<GeocodeResult> {
    try {
      // Construir dirección completa
      const parts = [direccion, ciudad, provincia, pais].filter(Boolean);
      const direccionCompleta = parts.join(', ');

      // Usar Nominatim de OpenStreetMap (servicio gratuito)
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccionCompleta)}&limit=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'AssetFlow-3.0' // Nominatim requiere User-Agent
        }
      });

      if (!response.ok) {
        throw new Error('Error en servicio de geocoding');
      }

      const results = await response.json();

      if (!results || results.length === 0) {
        throw new Error('No se encontraron coordenadas para esta dirección');
      }

      const location = results[0];

      return {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lon),
        direccionCompleta: location.display_name
      };
    } catch (error: any) {
      console.error('Error en geocoding:', error);
      throw new Error(error.message || 'Error al obtener coordenadas de la dirección');
    }
  },

  /**
   * Reverse Geocoding: Convierte coordenadas en dirección
   */
  async reverseGeocode(lat: number, lng: number): Promise<{ direccion: string; ciudad: string; provincia?: string; pais?: string }> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'AssetFlow-3.0'
        }
      });

      if (!response.ok) {
        throw new Error('Error en servicio de geocoding inverso');
      }

      const result = await response.json();

      if (!result || !result.address) {
        throw new Error('No se encontró dirección para estas coordenadas');
      }

      const address = result.address;

      return {
        direccion: address.road || address.pedestrian || '',
        ciudad: address.city || address.town || address.village || '',
        provincia: address.state || address.province || '',
        pais: address.country || 'España'
      };
    } catch (error: any) {
      console.error('Error en geocoding inverso:', error);
      throw new Error(error.message || 'Error al obtener dirección de las coordenadas');
    }
  }
};

export default emplazamientoService;
