/**
 * Terminal Service
 * API calls for system terminal and command execution
 */

import api from './api';
import { API_CONFIG } from '../config/api';

interface CommandResult {
  success: boolean;
  output: string | any;
  type: 'text' | 'json';
}

interface SystemInfo {
  hostname: string;
  uptime: string;
  memory: {
    total: string;
    used: string;
    free: string;
  };
  disk: {
    total: string;
    used: string;
    free: string;
    percent: string;
  };
  docker: {
    version: string;
  };
}

interface AllowedCommands {
  [category: string]: Array<{
    command: string;
    safe: boolean;
    requiresConfirm: boolean;
  }>;
}

class TerminalService {
  /**
   * Execute a command on the server
   */
  async executeCommand(command: string): Promise<CommandResult> {
    return await api.post('/admin/terminal/execute', { command });
  }

  /**
   * Get list of allowed commands
   */
  async getAllowedCommands(): Promise<AllowedCommands> {
    const response = await api.get('/admin/terminal/commands');
    return response.commands;
  }

  /**
   * Get system information
   */
  async getSystemInfo(): Promise<SystemInfo> {
    return await api.get('/admin/terminal/system-info');
  }

  /**
   * Get command history
   */
  async getCommandHistory(): Promise<string[]> {
    const response = await api.get('/admin/terminal/history');
    return response.history || [];
  }

  /**
   * Get configuration for backup or snapshot
   */
  async getConfig(type: 'backup' | 'snapshot'): Promise<any> {
    return await api.get(`/admin/terminal/config/${type}`);
  }

  /**
   * Update configuration for backup or snapshot
   */
  async updateConfig(type: 'backup' | 'snapshot', config: any): Promise<any> {
    return await api.put(`/admin/terminal/config/${type}`, config);
  }

  /**
   * Get URL for backup streaming execution
   */
  getBackupStreamUrl(): string {
    const baseURL = API_CONFIG.BASE_URL;
    const token = localStorage.getItem('token');
    return `${baseURL}/admin/backups/execute-stream?token=${token}`;
  }

  /**
   * Get URL for snapshot streaming execution
   */
  getSnapshotStreamUrl(): string {
    const baseURL = API_CONFIG.BASE_URL;
    const token = localStorage.getItem('token');
    return `${baseURL}/admin/snapshots/execute-stream?token=${token}`;
  }

  /**
   * Get download URL for a backup file
   */
  getBackupDownloadUrl(filename: string): string {
    const baseURL = API_CONFIG.BASE_URL;
    const token = localStorage.getItem('token');
    return `${baseURL}/admin/backups/download/${encodeURIComponent(filename)}?token=${token}`;
  }

  /**
   * Get download URL for a snapshot file
   */
  getSnapshotDownloadUrl(filename: string): string {
    const baseURL = API_CONFIG.BASE_URL;
    const token = localStorage.getItem('token');
    return `${baseURL}/admin/snapshots/download/${encodeURIComponent(filename)}?token=${token}`;
  }

  /**
   * Push snapshot to remote server with streaming
   */
  async pushSnapshotToRemote(filename: string, remoteConfig: {
    host: string;
    port?: number;
    path: string;
    user: string;
    password?: string;
  }): Promise<void> {
    await api.post('/admin/snapshots/push-remote', {
      filename,
      remoteConfig
    });
  }

  /**
   * Delete a backup file
   */
  async deleteBackup(filename: string): Promise<any> {
    return await api.delete(`/admin/backups/delete/${encodeURIComponent(filename)}`);
  }

  /**
   * Delete a snapshot file
   */
  async deleteSnapshot(filename: string): Promise<any> {
    return await api.delete(`/admin/snapshots/delete/${encodeURIComponent(filename)}`);
  }
}

export default new TerminalService();
