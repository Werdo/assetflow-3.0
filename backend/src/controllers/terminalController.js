const { asyncHandler } = require('../utils/errorHandler');
const { ValidationError, UnauthorizedError } = require('../utils/errorHandler');
const terminalService = require('../services/terminalService');
const logger = require('../utils/logger');

/**
 * @desc    Ejecutar comando en el terminal
 * @route   POST /api/admin/terminal/execute
 * @access  Private (Admin only)
 */
exports.executeCommand = asyncHandler(async (req, res) => {
  const { command } = req.body;

  if (!command || typeof command !== 'string') {
    throw new ValidationError('Comando requerido');
  }

  const result = await terminalService.executeCommand(command, req.user.id);

  logger.info('Terminal command executed via API', {
    command,
    userId: req.user.id,
    userName: req.user.name,
    success: result.success
  });

  res.status(200).json({
    success: true,
    data: result
  });
});

/**
 * @desc    Obtener lista de comandos permitidos
 * @route   GET /api/admin/terminal/commands
 * @access  Private (Admin only)
 */
exports.getAllowedCommands = asyncHandler(async (req, res) => {
  const commands = terminalService.getAllowedCommands();

  res.status(200).json({
    success: true,
    data: {
      commands
    }
  });
});

/**
 * @desc    Obtener información del sistema
 * @route   GET /api/admin/terminal/system-info
 * @access  Private (Admin only)
 */
exports.getSystemInfo = asyncHandler(async (req, res) => {
  const systemInfo = await terminalService.getSystemInfo();

  res.status(200).json({
    success: true,
    data: systemInfo
  });
});

/**
 * @desc    Obtener historial de comandos recientes
 * @route   GET /api/admin/terminal/history
 * @access  Private (Admin only)
 */
exports.getCommandHistory = asyncHandler(async (req, res) => {
  // This could be implemented with a database table storing command history
  // For now, return empty array
  res.status(200).json({
    success: true,
    data: {
      history: []
    }
  });
});

/**
 * @desc    Obtener configuración de backup o snapshot
 * @route   GET /api/admin/terminal/config/:type
 * @access  Private (Admin only)
 */
exports.getConfig = asyncHandler(async (req, res) => {
  const { type } = req.params;

  if (!['backup', 'snapshot'].includes(type)) {
    throw new ValidationError('Tipo de configuración inválido');
  }

  const config = await terminalService.getConfig(type);

  logger.info(`${type} configuration retrieved`, {
    userId: req.user.id,
    userName: req.user.name
  });

  res.status(200).json({
    success: true,
    data: config
  });
});

/**
 * @desc    Actualizar configuración de backup o snapshot
 * @route   PUT /api/admin/terminal/config/:type
 * @access  Private (Admin only)
 */
exports.updateConfig = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const config = req.body;

  if (!['backup', 'snapshot'].includes(type)) {
    throw new ValidationError('Tipo de configuración inválido');
  }

  if (!config || typeof config !== 'object') {
    throw new ValidationError('Configuración inválida');
  }

  const result = await terminalService.updateConfig(type, config);

  // Automatically reload the service after config update
  try {
    const reloadCommand = `${type}-reload`;
    await terminalService.executeCommand(reloadCommand, req.user.id);
    logger.info(`${type} service reloaded after config update`);
  } catch (error) {
    logger.warn(`Failed to reload ${type} service`, { error: error.message });
  }

  logger.info(`${type} configuration updated`, {
    userId: req.user.id,
    userName: req.user.name,
    config
  });

  res.status(200).json({
    success: true,
    data: result
  });
});

/**
 * @desc    Descargar archivo de backup
 * @route   GET /api/admin/backups/download/:filename
 * @access  Private (Admin only)
 */
exports.downloadBackup = asyncHandler(async (req, res) => {
  const { filename } = req.params;

  if (!filename || typeof filename !== 'string') {
    throw new ValidationError('Nombre de archivo requerido');
  }

  const filePath = await terminalService.getBackupFilePath(filename);

  logger.info('Backup file download', {
    filename,
    userId: req.user.id,
    userName: req.user.name
  });

  // Set headers for file download
  res.setHeader('Content-Type', 'application/gzip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  // Stream file to response
  const fs = require('fs');
  const fileStream = fs.createReadStream(filePath);

  fileStream.on('error', (error) => {
    logger.error('Error streaming backup file', { filename, error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error al descargar el archivo'
    });
  });

  fileStream.pipe(res);
});

/**
 * @desc    Descargar archivo de snapshot
 * @route   GET /api/admin/snapshots/download/:filename
 * @access  Private (Admin only)
 */
exports.downloadSnapshot = asyncHandler(async (req, res) => {
  const { filename } = req.params;

  if (!filename || typeof filename !== 'string') {
    throw new ValidationError('Nombre de archivo requerido');
  }

  const filePath = await terminalService.getSnapshotFilePath(filename);

  logger.info('Snapshot file download', {
    filename,
    userId: req.user.id,
    userName: req.user.name
  });

  // Set headers for file download
  res.setHeader('Content-Type', 'application/gzip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  // Stream file to response
  const fs = require('fs');
  const fileStream = fs.createReadStream(filePath);

  fileStream.on('error', (error) => {
    logger.error('Error streaming snapshot file', { filename, error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error al descargar el archivo'
    });
  });

  fileStream.pipe(res);
});

/**
 * @desc    Ejecutar backup con streaming en tiempo real
 * @route   POST /api/admin/backups/execute-stream
 * @access  Private (Admin only)
 */
exports.executeBackupStream = (req, res) => {
  logger.info('Backup streaming execution requested', {
    userId: req.user.id,
    userName: req.user.name
  });

  terminalService.streamBackupExecution(res, req.user.id);
};

/**
 * @desc    Ejecutar snapshot con streaming en tiempo real
 * @route   POST /api/admin/snapshots/execute-stream
 * @access  Private (Admin only)
 */
exports.executeSnapshotStream = (req, res) => {
  logger.info('Snapshot streaming execution requested', {
    userId: req.user.id,
    userName: req.user.name
  });

  terminalService.streamSnapshotExecution(res, req.user.id);
};

/**
 * @desc    Subir snapshot a servidor remoto con streaming
 * @route   POST /api/admin/snapshots/push-remote
 * @access  Private (Admin only)
 */
exports.pushSnapshotToRemote = (req, res) => {
  const { filename, remoteConfig } = req.body;

  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Nombre de archivo requerido'
    });
  }

  if (!remoteConfig || !remoteConfig.host || !remoteConfig.user || !remoteConfig.path) {
    return res.status(400).json({
      success: false,
      message: 'Configuración del servidor remoto incompleta'
    });
  }

  logger.info('Snapshot push to remote requested', {
    userId: req.user.id,
    userName: req.user.name,
    filename,
    remoteHost: remoteConfig.host
  });

  terminalService.streamSnapshotPush(res, req.user.id, filename, remoteConfig);
};

module.exports = exports;
