/**
 * Terminal Service
 * API calls for system terminal and command execution
 */

import api from './api';

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
    const response = await api.post('/admin/terminal/execute', { command });
    return response.data.data;
  }

  /**
   * Get list of allowed commands
   */
  async getAllowedCommands(): Promise<AllowedCommands> {
    const response = await api.get('/admin/terminal/commands');
    return response.data.data.commands;
  }

  /**
   * Get system information
   */
  async getSystemInfo(): Promise<SystemInfo> {
    const response = await api.get('/admin/terminal/system-info');
    return response.data.data;
  }

  /**
   * Get command history
   */
  async getCommandHistory(): Promise<string[]> {
    const response = await api.get('/admin/terminal/history');
    return response.data.data.history || [];
  }

  /**
   * Get configuration for backup or snapshot
   */
  async getConfig(type: 'backup' | 'snapshot'): Promise<any> {
    const response = await api.get(`/admin/terminal/config/${type}`);
    return response.data.data;
  }

  /**
   * Update configuration for backup or snapshot
   */
  async updateConfig(type: 'backup' | 'snapshot', config: any): Promise<any> {
    const response = await api.put(`/admin/terminal/config/${type}`, config);
    return response.data.data;
  }
}

export default new TerminalService();
