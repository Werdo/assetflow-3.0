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

module.exports = exports;
