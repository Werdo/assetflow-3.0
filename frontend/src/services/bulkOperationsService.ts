/**
 * AssetFlow 3.0 - Bulk Operations Service
 * Servicio para operaciones masivas de importación y exportación
 */

import apiClient from './api';

/**
 * Filtros para exportación de depósitos
 */
export interface ExportDepositosFilters {
  clienteId?: string;
  subclienteId?: string;
  emplazamientoId?: string;
  productoId?: string;
  estado?: string;
}

/**
 * Filtros para exportación de emplazamientos
 */
export interface ExportEmplazamientosFilters {
  clienteId?: string;
  subclienteId?: string;
  activo?: boolean;
  tipoIcono?: string;
}

/**
 * Resultado de importación
 */
export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  errors: Array<{
    row: number;
    error: string;
    codigo?: string;
  }>;
}

/**
 * Datos para actualización masiva de depósitos
 */
export interface BulkUpdateData {
  depositoIds: string[];
  updates: Record<string, any>;
}

class BulkOperationsService {
  /**
   * Exportar depósitos a CSV
   */
  async exportDepositosCSV(filters?: ExportDepositosFilters): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters?.clienteId) params.append('clienteId', filters.clienteId);
    if (filters?.subclienteId) params.append('subclienteId', filters.subclienteId);
    if (filters?.emplazamientoId) params.append('emplazamientoId', filters.emplazamientoId);
    if (filters?.productoId) params.append('productoId', filters.productoId);
    if (filters?.estado) params.append('estado', filters.estado);

    const response = await apiClient.get(`/bulk/depositos/export/csv?${params.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Exportar depósitos a Excel
   */
  async exportDepositosExcel(filters?: ExportDepositosFilters): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters?.clienteId) params.append('clienteId', filters.clienteId);
    if (filters?.subclienteId) params.append('subclienteId', filters.subclienteId);
    if (filters?.emplazamientoId) params.append('emplazamientoId', filters.emplazamientoId);
    if (filters?.productoId) params.append('productoId', filters.productoId);
    if (filters?.estado) params.append('estado', filters.estado);

    const response = await apiClient.get(`/bulk/depositos/export/excel?${params.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Exportar emplazamientos a CSV
   */
  async exportEmplazamientosCSV(filters?: ExportEmplazamientosFilters): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters?.clienteId) params.append('clienteId', filters.clienteId);
    if (filters?.subclienteId) params.append('subclienteId', filters.subclienteId);
    if (filters?.activo !== undefined) params.append('activo', String(filters.activo));
    if (filters?.tipoIcono) params.append('tipoIcono', filters.tipoIcono);

    const response = await apiClient.get(`/bulk/emplazamientos/export/csv?${params.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Exportar emplazamientos a Excel
   */
  async exportEmplazamientosExcel(filters?: ExportEmplazamientosFilters): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters?.clienteId) params.append('clienteId', filters.clienteId);
    if (filters?.subclienteId) params.append('subclienteId', filters.subclienteId);
    if (filters?.activo !== undefined) params.append('activo', String(filters.activo));
    if (filters?.tipoIcono) params.append('tipoIcono', filters.tipoIcono);

    const response = await apiClient.get(`/bulk/emplazamientos/export/excel?${params.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Importar depósitos desde archivo CSV/Excel
   */
  async importDepositos(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/bulk/depositos/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data.results;
  }

  /**
   * Importar emplazamientos desde archivo CSV/Excel
   */
  async importEmplazamientos(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/bulk/emplazamientos/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data.results;
  }

  /**
   * Actualización masiva de depósitos
   */
  async updateDepositosBulk(data: BulkUpdateData): Promise<{ modified: number }> {
    const response = await apiClient.put('/bulk/depositos/update', data);
    return { modified: response.data.modified };
  }

  /**
   * Descargar archivo blob
   */
  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

const bulkOperationsService = new BulkOperationsService();
export default bulkOperationsService;
