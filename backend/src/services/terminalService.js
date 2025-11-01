const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');

const execAsync = promisify(exec);

/**
 * Lista de comandos permitidos con sus validaciones
 * Solo comandos de sistema seguros y necesarios para administración
 */
const ALLOWED_COMMANDS = {
  // Docker commands
  'docker ps': { safe: true, category: 'docker' },
  'docker stats --no-stream': { safe: true, category: 'docker' },
  'docker logs': { safe: true, category: 'docker', args: ['--tail'] },
  'docker inspect': { safe: true, category: 'docker' },
  'docker compose ps': { safe: true, category: 'docker' },
  'docker compose logs': { safe: true, category: 'docker', args: ['--tail'] },
  'docker compose restart': { safe: false, category: 'docker', requiresConfirm: true },
  'docker system df': { safe: true, category: 'docker' },

  // System info
  'df -h': { safe: true, category: 'system' },
  'du -sh': { safe: true, category: 'system' },
  'free -h': { safe: true, category: 'system' },
  'uptime': { safe: true, category: 'system' },
  'ps aux': { safe: true, category: 'system' },
  'top -bn1': { safe: true, category: 'system' },
  'netstat -tulpn': { safe: true, category: 'system' },

  // Backup & Snapshot commands
  'backup-status': { safe: true, category: 'backup', custom: true },
  'backup-run': { safe: false, category: 'backup', custom: true, requiresConfirm: true },
  'backup-list': { safe: true, category: 'backup', custom: true },
  'snapshot-status': { safe: true, category: 'backup', custom: true },
  'snapshot-run': { safe: false, category: 'backup', custom: true, requiresConfirm: true },
  'snapshot-list': { safe: true, category: 'backup', custom: true },

  // Logs
  'tail': { safe: true, category: 'logs', args: ['-n', '-f'] },
  'grep': { safe: true, category: 'logs', args: ['-i', '-A', '-B'] },

  // Git
  'git status': { safe: true, category: 'git' },
  'git log --oneline': { safe: true, category: 'git', args: ['-n'] },
  'git diff': { safe: true, category: 'git' },
  'git branch': { safe: true, category: 'git' },
};

/**
 * Comandos peligrosos que nunca deben ser permitidos
 */
const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\//, // rm -rf /
  /dd\s+if=/, // dd commands
  /mkfs/, // format filesystem
  />\/dev\//, // write to devices
  /fork\s*bomb/, // fork bombs
  /:\(\)\{.*;\};/, // bash fork bomb
  /sudo\s+passwd/, // change passwords
  /userdel/, // delete users
  /shutdown/, // shutdown system
  /reboot/, // reboot system
  /halt/, // halt system
  /init\s+0/, // shutdown
];

class TerminalService {
  constructor() {
    this.scriptsDir = path.join(__dirname, '../../..', 'scripts');
  }

  /**
   * Valida si un comando es seguro ejecutar
   */
  validateCommand(command) {
    // Check dangerous patterns
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(command)) {
        throw new Error(`Comando peligroso detectado: ${command}`);
      }
    }

    // Extract base command
    const baseCommand = command.split(' ')[0];
    const fullCommand = command.trim();

    // Check if command starts with an allowed command
    for (const [allowedCmd, config] of Object.entries(ALLOWED_COMMANDS)) {
      if (fullCommand.startsWith(allowedCmd)) {
        return { allowed: true, config, baseCommand: allowedCmd };
      }
    }

    throw new Error(`Comando no permitido: ${baseCommand}`);
  }

  /**
   * Ejecuta un comando custom (backup, snapshot, etc.)
   */
  async executeCustomCommand(command) {
    const commands = {
      'backup-status': async () => {
        try {
          const logPath = '/var/log/assetflow/backup.log';
          const { stdout } = await execAsync(`tail -20 ${logPath}`);
          return { success: true, output: stdout, type: 'text' };
        } catch (error) {
          return { success: false, output: 'No hay logs disponibles', type: 'text' };
        }
      },

      'backup-run': async () => {
        const scriptPath = path.join(this.scriptsDir, 'backup.sh');
        try {
          const { stdout, stderr } = await execAsync(`bash ${scriptPath}`);
          return { success: true, output: stdout + stderr, type: 'text' };
        } catch (error) {
          return { success: false, output: error.message, type: 'text' };
        }
      },

      'backup-list': async () => {
        try {
          const backupDir = '/var/backups/assetflow';
          const { stdout } = await execAsync(`find ${backupDir} -type f -name "*.tar.gz" | sort -r | head -20`);
          const files = stdout.trim().split('\n').filter(f => f);

          const backups = [];
          for (const file of files) {
            const stats = await fs.stat(file);
            backups.push({
              path: file,
              size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
              date: stats.mtime.toISOString()
            });
          }

          return { success: true, output: backups, type: 'json' };
        } catch (error) {
          return { success: false, output: 'No se encontraron backups', type: 'text' };
        }
      },

      'snapshot-status': async () => {
        try {
          const logPath = '/var/log/assetflow/snapshot.log';
          const { stdout } = await execAsync(`tail -20 ${logPath}`);
          return { success: true, output: stdout, type: 'text' };
        } catch (error) {
          return { success: false, output: 'No hay logs disponibles', type: 'text' };
        }
      },

      'snapshot-run': async () => {
        const scriptPath = path.join(this.scriptsDir, 'snapshot.sh');
        try {
          const { stdout, stderr } = await execAsync(`bash ${scriptPath}`);
          return { success: true, output: stdout + stderr, type: 'text' };
        } catch (error) {
          return { success: false, output: error.message, type: 'text' };
        }
      },

      'snapshot-list': async () => {
        try {
          const snapshotDir = '/var/snapshots/assetflow';
          const { stdout } = await execAsync(`find ${snapshotDir} -type f -name "*.tar.gz" | sort -r | head -20`);
          const files = stdout.trim().split('\n').filter(f => f);

          const snapshots = [];
          for (const file of files) {
            const stats = await fs.stat(file);
            snapshots.push({
              path: file,
              size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
              date: stats.mtime.toISOString()
            });
          }

          return { success: true, output: snapshots, type: 'json' };
        } catch (error) {
          return { success: false, output: 'No se encontraron snapshots', type: 'text' };
        }
      }
    };

    const handler = commands[command];
    if (!handler) {
      throw new Error(`Comando custom no encontrado: ${command}`);
    }

    return await handler();
  }

  /**
   * Ejecuta un comando del sistema
   */
  async executeCommand(command, userId) {
    try {
      // Validate command
      const validation = this.validateCommand(command);

      logger.info('Terminal command executed', {
        command,
        userId,
        category: validation.config.category,
        safe: validation.config.safe
      });

      // Execute custom command
      if (validation.config.custom) {
        return await this.executeCustomCommand(command);
      }

      // Execute system command with timeout
      const timeout = 30000; // 30 seconds
      const { stdout, stderr } = await execAsync(command, {
        timeout,
        maxBuffer: 1024 * 1024 // 1MB
      });

      return {
        success: true,
        output: stdout || stderr,
        type: 'text'
      };

    } catch (error) {
      logger.error('Terminal command failed', {
        command,
        userId,
        error: error.message
      });

      return {
        success: false,
        output: error.message,
        type: 'text'
      };
    }
  }

  /**
   * Obtiene la lista de comandos permitidos agrupados por categoría
   */
  getAllowedCommands() {
    const grouped = {};

    for (const [command, config] of Object.entries(ALLOWED_COMMANDS)) {
      const { category, safe, requiresConfirm } = config;

      if (!grouped[category]) {
        grouped[category] = [];
      }

      grouped[category].push({
        command,
        safe,
        requiresConfirm: requiresConfirm || false
      });
    }

    return grouped;
  }

  /**
   * Obtiene información del sistema
   */
  async getSystemInfo() {
    try {
      const [
        { stdout: hostname },
        { stdout: uptime },
        { stdout: memory },
        { stdout: disk },
        { stdout: dockerInfo }
      ] = await Promise.all([
        execAsync('hostname'),
        execAsync('uptime -p'),
        execAsync('free -h | grep Mem | awk \'{print $2, $3, $4}\''),
        execAsync('df -h / | tail -1 | awk \'{print $2, $3, $4, $5}\''),
        execAsync('docker info --format "{{.ServerVersion}}"').catch(() => ({ stdout: 'N/A' }))
      ]);

      const [memTotal, memUsed, memFree] = memory.trim().split(' ');
      const [diskTotal, diskUsed, diskFree, diskPercent] = disk.trim().split(' ');

      return {
        hostname: hostname.trim(),
        uptime: uptime.trim().replace('up ', ''),
        memory: {
          total: memTotal,
          used: memUsed,
          free: memFree
        },
        disk: {
          total: diskTotal,
          used: diskUsed,
          free: diskFree,
          percent: diskPercent
        },
        docker: {
          version: dockerInfo.trim()
        }
      };
    } catch (error) {
      logger.error('Failed to get system info', { error: error.message });
      return null;
    }
  }
}

module.exports = new TerminalService();
