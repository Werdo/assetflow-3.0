/**
 * AssetFlow 3.0 - Dashboard Service
 * Servicio para obtener datos del dashboard principal
 */

import apiClient from './api';
import type {
  DashboardKPIsExtended as DashboardKPIs,
  EmplazamientoMapData,
  AlertaExtended as Alerta,
} from '../types';

/**
 * Servicio de Dashboard con todos los métodos necesarios
 */
export const dashboardService = {
  /**
   * Obtiene los KPIs del dashboard en tiempo real
   * @returns Promise con los 8 KPIs principales
   */
  async getKPIs(): Promise<DashboardKPIs> {
    try {
      const data = await apiClient.get<DashboardKPIs>('/dashboard/kpis');
      return data;
    } catch (error: any) {
      console.error('Error al obtener KPIs:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar KPIs del dashboard');
    }
  },

  /**
   * Obtiene los datos de emplazamientos para el mapa
   * Incluye coordenadas, estado y datos para popups
   * @returns Promise con array de emplazamientos para el mapa
   */
  async getMapData(): Promise<EmplazamientoMapData[]> {
    try {
      const data = await apiClient.get<{ emplazamientos: EmplazamientoMapData[]; total: number }>('/dashboard/mapa');
      return data.emplazamientos || [];
    } catch (error: any) {
      console.error('Error al obtener datos del mapa:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar datos del mapa');
    }
  },

  /**
   * Obtiene las top 10 alertas más críticas
   * Ordenadas por prioridad y días restantes
   * @returns Promise con array de alertas críticas
   */
  async getAlertasCriticas(): Promise<Alerta[]> {
    try {
      const data = await apiClient.get<{
        alertasCriticas: Alerta[];
        depositosVencidos: any[];
        depositosProximosVencer: any[];
        resumen: any[];
        totales: any;
      }>('/dashboard/alertas-criticas');
      return data.alertasCriticas || [];
    } catch (error: any) {
      console.error('Error al obtener alertas críticas:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar alertas críticas');
    }
  },

  /**
   * Obtiene el resumen ejecutivo completo del dashboard
   * Incluye KPIs, mapa y alertas en una sola llamada
   * @returns Promise con resumen completo
   */
  async getResumenEjecutivo(): Promise<{
    kpis: DashboardKPIs;
    mapa: EmplazamientoMapData[];
    alertasCriticas: Alerta[];
  }> {
    try {
      const data = await apiClient.get<{
        kpis: DashboardKPIs;
        mapa: EmplazamientoMapData[];
        alertasCriticas: Alerta[];
      }>('/dashboard/resumen-ejecutivo');
      return data;
    } catch (error: any) {
      console.error('Error al obtener resumen ejecutivo:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar resumen ejecutivo');
    }
  },

  /**
   * Obtiene estadísticas de depósitos por estado
   * @returns Promise con estadísticas
   */
  async getEstadisticasDepositos(): Promise<{
    activos: number;
    proximosVencimiento: number;
    vencidos: number;
    facturados: number;
    devueltos: number;
  }> {
    try {
      const data = await apiClient.get<{
        activos: number;
        proximosVencimiento: number;
        vencidos: number;
        facturados: number;
        devueltos: number;
      }>('/dashboard/estadisticas-depositos');
      return data;
    } catch (error: any) {
      console.error('Error al obtener estadísticas de depósitos:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar estadísticas de depósitos');
    }
  },

  /**
   * Obtiene el top 5 de clientes por valor depositado
   * @returns Promise con array de clientes
   */
  async getTopClientes(): Promise<Array<{
    _id: string;
    nombre: string;
    valorTotal: number;
    depositosActivos: number;
  }>> {
    try {
      const data = await apiClient.get<Array<{
        _id: string;
        nombre: string;
        valorTotal: number;
        depositosActivos: number;
      }>>('/dashboard/top-clientes');
      return data;
    } catch (error: any) {
      console.error('Error al obtener top clientes:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar top clientes');
    }
  },

  /**
   * Obtiene el top 5 de productos por cantidad depositada
   * @returns Promise con array de productos
   */
  async getTopProductos(): Promise<Array<{
    _id: string;
    nombre: string;
    cantidadTotal: number;
    valorTotal: number;
  }>> {
    try {
      const data = await apiClient.get<Array<{
        _id: string;
        nombre: string;
        cantidadTotal: number;
        valorTotal: number;
      }>>('/dashboard/top-productos');
      return data;
    } catch (error: any) {
      console.error('Error al obtener top productos:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar top productos');
    }
  },
};

export default dashboardService;
