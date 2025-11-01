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
  'backup-reload': { safe: false, category: 'backup', custom: true, requiresConfirm: false },
  'snapshot-status': { safe: true, category: 'backup', custom: true },
  'snapshot-run': { safe: false, category: 'backup', custom: true, requiresConfirm: true },
  'snapshot-list': { safe: true, category: 'backup', custom: true },
  'snapshot-reload': { safe: false, category: 'backup', custom: true, requiresConfirm: false },

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
          const backupDir = '/backup';
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
          const logPath = '/snapshots/snapshot.log';
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
          const snapshotDir = '/snapshots';
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
      },

      'backup-reload': async () => {
        try {
          // Reload cron service to apply new backup schedule
          await execAsync('crontab -l > /tmp/current_cron.bak');
          const { stdout, stderr } = await execAsync('service cron reload || systemctl reload cron || true');
          logger.info('Backup service reloaded');
          return { success: true, output: 'Servicio de backup reiniciado correctamente', type: 'text' };
        } catch (error) {
          logger.error('Failed to reload backup service', { error: error.message });
          return { success: false, output: `Error al reiniciar servicio: ${error.message}`, type: 'text' };
        }
      },

      'snapshot-reload': async () => {
        try {
          // Reload cron service to apply new snapshot schedule
          await execAsync('crontab -l > /tmp/current_cron.bak');
          const { stdout, stderr } = await execAsync('service cron reload || systemctl reload cron || true');
          logger.info('Snapshot service reloaded');
          return { success: true, output: 'Servicio de snapshot reiniciado correctamente', type: 'text' };
        } catch (error) {
          logger.error('Failed to reload snapshot service', { error: error.message });
          return { success: false, output: `Error al reiniciar servicio: ${error.message}`, type: 'text' };
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
   * Obtiene la configuración de backup o snapshot
   */
  async getConfig(type) {
    try {
      const configPath = path.join(this.scriptsDir, `${type}.config.json`);
      const configData = await fs.readFile(configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      logger.error(`Failed to read ${type} config`, { error: error.message });
      throw new Error(`No se pudo leer la configuración de ${type}`);
    }
  }

  /**
   * Actualiza la configuración de backup o snapshot
   */
  async updateConfig(type, config) {
    try {
      // Validar tipo
      if (!['backup', 'snapshot'].includes(type)) {
        throw new Error('Tipo de configuración inválido');
      }

      const configPath = path.join(this.scriptsDir, `${type}.config.json`);

      // Hacer backup del archivo actual
      const backupPath = `${configPath}.backup`;
      try {
        const currentConfig = await fs.readFile(configPath, 'utf8');
        await fs.writeFile(backupPath, currentConfig, 'utf8');
      } catch (error) {
        logger.warn(`Could not create backup of ${type} config`);
      }

      // Guardar nueva configuración
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');

      logger.info(`${type} configuration updated successfully`);
      return { success: true, message: 'Configuración actualizada correctamente' };
    } catch (error) {
      logger.error(`Failed to update ${type} config`, { error: error.message });
      throw new Error(`No se pudo actualizar la configuración de ${type}: ${error.message}`);
    }
  }

  /**
   * Ejecuta un comando de backup con streaming en tiempo real
   */
  streamBackupExecution(res, userId) {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    logger.info('Starting backup streaming execution', { userId });

    const isWindows = process.platform === 'win32';

    // In Windows development environment, simulate backup process
    if (isWindows) {
      this._simulateBackupExecution(res, userId);
      return;
    }

    // In production (Linux), run actual backup script
    const scriptPath = path.join(this.scriptsDir, 'backup.sh');
    const backupProcess = spawn('sh', [scriptPath]);

    // Stream stdout
    backupProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      lines.forEach(line => {
        res.write(`data: ${JSON.stringify({ type: 'stdout', message: line })}\n\n`);
      });
    });

    // Stream stderr
    backupProcess.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      lines.forEach(line => {
        res.write(`data: ${JSON.stringify({ type: 'stderr', message: line })}\n\n`);
      });
    });

    // Handle process completion
    backupProcess.on('close', (code) => {
      logger.info('Backup process completed', { userId, exitCode: code });
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        success: code === 0,
        exitCode: code,
        message: code === 0 ? 'Backup completado exitosamente' : 'Error al ejecutar backup'
      })}\n\n`);
      res.end();
    });

    // Handle process errors
    backupProcess.on('error', (error) => {
      logger.error('Backup process error', { userId, error: error.message });
      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: `Error: ${error.message}`
      })}\n\n`);
      res.end();
    });
  }

  /**
   * Simula la ejecución de backup para desarrollo en Windows
   */
  _simulateBackupExecution(res, userId) {
    const messages = [
      '=== AssetFlow Backup Process (Modo Simulación - Windows) ===',
      'Iniciando proceso de backup...',
      'Verificando configuración...',
      'Conectando a MongoDB...',
      'Exportando base de datos assetflow...',
      '  - Colección: users',
      '  - Colección: productos',
      '  - Colección: clientes',
      '  - Colección: emplazamientos',
      '  - Colección: depositos',
      '  - Colección: alertas',
      'Base de datos exportada exitosamente',
      'Comprimiendo archivos...',
      'Aplicando rotación de backups (7 días / 4 semanas / 6 meses)...',
      'Backup completado: assetflow_backup_' + new Date().toISOString().split('T')[0] + '.tar.gz',
      'Tamaño: 1.2 MB',
      '=== Backup Finalizado Exitosamente ==='
    ];

    let index = 0;
    const interval = setInterval(() => {
      if (index < messages.length) {
        res.write(`data: ${JSON.stringify({ type: 'stdout', message: messages[index] })}\n\n`);
        index++;
      } else {
        clearInterval(interval);
        res.write(`data: ${JSON.stringify({
          type: 'complete',
          success: true,
          exitCode: 0,
          message: 'Backup completado exitosamente (simulación)'
        })}\n\n`);
        res.end();
      }
    }, 300); // Un mensaje cada 300ms
  }

  /**
   * Ejecuta un comando de snapshot con streaming en tiempo real
   */
  streamSnapshotExecution(res, userId) {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    logger.info('Starting snapshot streaming execution', { userId });

    const isWindows = process.platform === 'win32';

    // In Windows development environment, simulate snapshot process
    if (isWindows) {
      this._simulateSnapshotExecution(res, userId);
      return;
    }

    // In production (Linux), run actual snapshot script
    const scriptPath = path.join(this.scriptsDir, 'snapshot.sh');

    // Spawn snapshot process with bash (snapshot.sh uses bash-specific syntax)
    const snapshotProcess = spawn('bash', [scriptPath]);

    // Stream stdout
    snapshotProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      lines.forEach(line => {
        res.write(`data: ${JSON.stringify({ type: 'stdout', message: line })}\n\n`);
      });
    });

    // Stream stderr
    snapshotProcess.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      lines.forEach(line => {
        res.write(`data: ${JSON.stringify({ type: 'stderr', message: line })}\n\n`);
      });
    });

    // Handle process completion
    snapshotProcess.on('close', (code) => {
      logger.info('Snapshot process completed', { userId, exitCode: code });
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        success: code === 0,
        exitCode: code,
        message: code === 0 ? 'Snapshot completado exitosamente' : 'Error al ejecutar snapshot'
      })}\n\n`);
      res.end();
    });

    // Handle process errors
    snapshotProcess.on('error', (error) => {
      logger.error('Snapshot process error', { userId, error: error.message });
      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: `Error: ${error.message}`
      })}\n\n`);
      res.end();
    });
  }

  /**
   * Simula la ejecución de snapshot para desarrollo en Windows
   */
  _simulateSnapshotExecution(res, userId) {
    const messages = [
      '=== AssetFlow Docker Snapshot Process (Modo Simulación - Windows) ===',
      'Iniciando proceso de snapshot...',
      'Verificando configuración...',
      'Deteniendo contenedores Docker...',
      '  ✓ Contenedor assetflow-backend detenido',
      '  ✓ Contenedor assetflow-frontend detenido',
      '  ✓ Contenedor mongodb detenido',
      'Creando snapshots de volúmenes Docker...',
      '  - Volumen: assetflow_mongodb-data',
      '  - Volumen: assetflow_backend-uploads',
      'Exportando imágenes Docker...',
      '  - Imagen: assetflow-backend:latest',
      '  - Imagen: assetflow-frontend:latest',
      '  - Imagen: mongo:latest',
      'Comprimiendo snapshot...',
      'Reiniciando contenedores...',
      '  ✓ Contenedor mongodb reiniciado',
      '  ✓ Contenedor assetflow-backend reiniciado',
      '  ✓ Contenedor assetflow-frontend reiniciado',
      'Aplicando rotación de snapshots (10 últimos / 30 días máx)...',
      'Snapshot completado: docker_snapshot_' + new Date().toISOString().split('T')[0] + '.tar',
      'Tamaño: 512 MB',
      '=== Snapshot Finalizado Exitosamente ==='
    ];

    let index = 0;
    const interval = setInterval(() => {
      if (index < messages.length) {
        res.write(`data: ${JSON.stringify({ type: 'stdout', message: messages[index] })}\n\n`);
        index++;
      } else {
        clearInterval(interval);
        res.write(`data: ${JSON.stringify({
          type: 'complete',
          success: true,
          exitCode: 0,
          message: 'Snapshot completado exitosamente (simulación)'
        })}\n\n`);
        res.end();
      }
    }, 350); // Un mensaje cada 350ms
  }

  /**
   * Sube un snapshot a un servidor remoto con streaming en tiempo real
   */
  streamSnapshotPush(res, userId, filename, remoteConfig) {
    const { host, port, path: remotePath, user, password } = remoteConfig;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    logger.info('Starting snapshot push to remote', { userId, filename, host });

    // Validate filename
    if (filename.includes('..') || filename.includes('/')) {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: 'Nombre de archivo inválido'
      })}\n\n`);
      res.end();
      return;
    }

    const snapshotDir = '/snapshots';
    const localPath = path.join(snapshotDir, filename);

    // Build SCP command with sshpass if password is provided, or without for key-based auth
    let scpCommand;
    if (password) {
      scpCommand = `sshpass -p "${password}" scp -P ${port || 22} -o StrictHostKeyChecking=no "${localPath}" ${user}@${host}:${remotePath}`;
    } else {
      scpCommand = `scp -P ${port || 22} -o StrictHostKeyChecking=no "${localPath}" ${user}@${host}:${remotePath}`;
    }

    res.write(`data: ${JSON.stringify({
      type: 'stdout',
      message: `Iniciando transferencia a ${host}...`
    })}\n\n`);

    // Spawn SCP process
    const scpProcess = spawn('sh', ['-c', scpCommand]);

    // Stream stdout
    scpProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      lines.forEach(line => {
        res.write(`data: ${JSON.stringify({ type: 'stdout', message: line })}\n\n`);
      });
    });

    // Stream stderr (SCP sends progress to stderr)
    scpProcess.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      lines.forEach(line => {
        res.write(`data: ${JSON.stringify({ type: 'stdout', message: line })}\n\n`);
      });
    });

    // Handle process completion
    scpProcess.on('close', (code) => {
      logger.info('Snapshot push completed', { userId, filename, host, exitCode: code });
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        success: code === 0,
        exitCode: code,
        message: code === 0 ? 'Snapshot transferido exitosamente' : 'Error al transferir snapshot'
      })}\n\n`);
      res.end();
    });

    // Handle process errors
    scpProcess.on('error', (error) => {
      logger.error('Snapshot push error', { userId, filename, host, error: error.message });
      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: `Error: ${error.message}`
      })}\n\n`);
      res.end();
    });
  }

  /**
   * Obtiene la ruta completa de un archivo de backup
   */
  async getBackupFilePath(filename) {
    try {
      // Validar que el nombre de archivo no contenga path traversal
      if (filename.includes('..') || filename.includes('/')) {
        throw new Error('Nombre de archivo inválido');
      }

      const backupDir = '/backup';
      const filePath = path.join(backupDir, filename);

      // Verificar que el archivo existe
      await fs.access(filePath);

      logger.info('Backup file accessed', { filename, filePath });
      return filePath;
    } catch (error) {
      logger.error('Failed to access backup file', { filename, error: error.message });
      throw new Error(`No se pudo acceder al archivo de backup: ${filename}`);
    }
  }

  /**
   * Obtiene la ruta completa de un archivo de snapshot
   */
  async getSnapshotFilePath(filename) {
    try {
      // Validar que el nombre de archivo no contenga path traversal
      if (filename.includes('..') || filename.includes('/')) {
        throw new Error('Nombre de archivo inválido');
      }

      const snapshotDir = '/snapshots';
      const filePath = path.join(snapshotDir, filename);

      // Verificar que el archivo existe
      await fs.access(filePath);

      logger.info('Snapshot file accessed', { filename, filePath });
      return filePath;
    } catch (error) {
      logger.error('Failed to access snapshot file', { filename, error: error.message });
      throw new Error(`No se pudo acceder al archivo de snapshot: ${filename}`);
    }
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
