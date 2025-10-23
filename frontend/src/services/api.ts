/**
 * AssetFlow 3.0 - Axios API Client
 * Complete API client with JWT authentication, interceptors, and error handling
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { API_CONFIG } from '../config/api';
import type { APIResponse, ErrorResponse } from '../types';

class APIClient {
  private client: AxiosInstance;
  private refreshing: boolean = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor - add JWT token to headers
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle errors and token refresh
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: AxiosError<ErrorResponse>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Handle 401 Unauthorized - token expired or invalid
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.refreshing) {
            // If already refreshing, queue this request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then(() => {
                return this.client(originalRequest);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          this.refreshing = true;

          // For now, just clear token and redirect to login
          // In future, implement token refresh logic here
          this.clearToken();
          window.location.href = '/login';

          return Promise.reject(error);
        }

        // Handle other errors
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: AxiosError<ErrorResponse>): Error {
    if (error.response) {
      // Server responded with error status
      const errorMessage = error.response.data?.message || 'Error en el servidor';
      const customError = new Error(errorMessage);
      (customError as any).response = error.response;
      (customError as any).status = error.response.status;
      (customError as any).errors = error.response.data?.errors;
      return customError;
    } else if (error.request) {
      // Request was made but no response received
      return new Error('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
    } else {
      // Something else happened
      return new Error(error.message || 'Error desconocido');
    }
  }

  // Token management
  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  public setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  public clearToken(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  // HTTP Methods
  public async get<T = any>(url: string, config?: any): Promise<T> {
    const response = await this.client.get<APIResponse<T>>(url, config);
    return response.data.data as T;
  }

  public async post<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post<APIResponse<T>>(url, data, config);
    return response.data.data as T;
  }

  public async put<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.put<APIResponse<T>>(url, data, config);
    return response.data.data as T;
  }

  public async patch<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.patch<APIResponse<T>>(url, data, config);
    return response.data.data as T;
  }

  public async delete<T = any>(url: string, config?: any): Promise<T> {
    const response = await this.client.delete<APIResponse<T>>(url, config);
    return response.data.data as T;
  }

  // Get raw axios instance if needed
  public getAxiosInstance(): AxiosInstance {
    return this.client;
  }
}

// Create singleton instance
const apiClient = new APIClient();

export default apiClient;
