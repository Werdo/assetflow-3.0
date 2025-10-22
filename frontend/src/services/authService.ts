/**
 * AssetFlow 3.0 - Authentication Service
 * Complete authentication API calls
 */

import apiClient from './api';
import { API_ENDPOINTS } from '../config/api';
import type { User, AuthResponse, LoginCredentials, RegisterData } from '../types';

export const authService = {
  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );

    // Store token and user in localStorage
    if (response.token) {
      apiClient.setToken(response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }

    return response;
  },

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      data
    );

    // Store token and user in localStorage
    if (response.token) {
      apiClient.setToken(response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }

    return response;
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } finally {
      // Clear local storage even if API call fails
      apiClient.clearToken();
    }
  },

  /**
   * Get current user profile
   */
  async getMe(): Promise<User> {
    const response = await apiClient.get<{ user: User }>(API_ENDPOINTS.AUTH.ME);
    localStorage.setItem('user', JSON.stringify(response.user));
    return response.user;
  },

  /**
   * Update current user profile
   */
  async updateMe(data: Partial<Pick<User, 'name' | 'email'>>): Promise<User> {
    const response = await apiClient.put<{ user: User }>(
      API_ENDPOINTS.AUTH.UPDATE_ME,
      data
    );
    localStorage.setItem('user', JSON.stringify(response.user));
    return response.user;
  },

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.put(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
      currentPassword,
      newPassword,
    });
  },

  /**
   * Get current user from localStorage
   */
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return !!(token && user);
  },

  /**
   * Check if user has specific role
   */
  hasRole(role: User['role']): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  },

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.hasRole('admin');
  },

  /**
   * Check if user is admin or manager
   */
  isAdminOrManager(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin' || user?.role === 'manager';
  },
};

export default authService;
