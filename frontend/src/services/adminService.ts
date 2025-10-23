/**
 * AssetFlow 3.0 - Admin Service
 * Service for admin operations: user management, system health, and statistics
 */

import api from './api';
import type { User, RegisterData, PaginatedResponse } from '../types';

// ============================================
// TYPES
// ============================================

export interface SystemHealth {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
  database: {
    status: string;
    host: string;
    name: string;
  };
  memory: {
    total: number;
    free: number;
    used: number;
    usedPercentage: string;
    processUsage: any;
  };
  system: {
    platform: string;
    arch: string;
    cpus: number;
    loadAverage: number[];
    hostname: string;
  };
}

export interface SystemStats {
  users: {
    total: number;
    active: number;
    inactive: number;
    newLastWeek: number;
  };
  clientes: {
    total: number;
    active: number;
    inactive: number;
  };
  emplazamientos: {
    total: number;
    active: number;
    inactive: number;
  };
  productos: {
    total: number;
    active: number;
    inactive: number;
  };
  depositos: {
    total: number;
    active: number;
    inactive: number;
    newLastWeek: number;
    valorTotal: number;
  };
  alertas: {
    total: number;
    pending: number;
    resolved: number;
    newLastWeek: number;
  };
  timestamp: string;
}

export interface DatabaseInfo {
  database: string;
  collections: Array<{
    name: string;
    count: number;
    size: number;
    avgObjSize: number;
    storageSize: number;
    indexes: number;
  }>;
  totalSize: number;
  totalDocuments: number;
}

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'admin' | 'manager' | 'user';
  active?: boolean;
}

export interface CreateUserData extends RegisterData {
  active?: boolean;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: 'admin' | 'manager' | 'user';
  active?: boolean;
}

export interface ResetPasswordData {
  newPassword: string;
}

// ============================================
// USER MANAGEMENT
// ============================================

/**
 * Get all users (paginated)
 */
export const getAllUsers = async (filters?: UserFilters): Promise<PaginatedResponse<User>> => {
  const params = new URLSearchParams();

  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.search) params.append('search', filters.search);
  if (filters?.role) params.append('role', filters.role);
  if (filters?.active !== undefined) params.append('active', filters.active.toString());

  return await api.get(`/admin/users?${params.toString()}`);
};

/**
 * Get single user by ID
 */
export const getUserById = async (id: string): Promise<{ user: User }> => {
  return await api.get(`/admin/users/${id}`);
};

/**
 * Create new user
 */
export const createUser = async (data: CreateUserData): Promise<{ user: User }> => {
  return await api.post('/admin/users', data);
};

/**
 * Update user
 */
export const updateUser = async (id: string, data: UpdateUserData): Promise<{ user: User }> => {
  return await api.put(`/admin/users/${id}`, data);
};

/**
 * Delete user
 */
export const deleteUser = async (id: string): Promise<void> => {
  return await api.delete(`/admin/users/${id}`);
};

/**
 * Reset user password
 */
export const resetUserPassword = async (id: string, data: ResetPasswordData): Promise<void> => {
  return await api.post(`/admin/users/${id}/reset-password`, data);
};

// ============================================
// SYSTEM HEALTH & STATS
// ============================================

/**
 * Get system health status
 */
export const getSystemHealth = async (): Promise<SystemHealth> => {
  return await api.get('/admin/system/health');
};

/**
 * Get system statistics
 */
export const getSystemStats = async (): Promise<SystemStats> => {
  return await api.get('/admin/system/stats');
};

/**
 * Get database information
 */
export const getDatabaseInfo = async (): Promise<DatabaseInfo> => {
  return await api.get('/admin/system/database');
};

// ============================================
// EXPORT ALL AS DEFAULT
// ============================================

const adminService = {
  // User management
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,

  // System health & stats
  getSystemHealth,
  getSystemStats,
  getDatabaseInfo,
};

export default adminService;
