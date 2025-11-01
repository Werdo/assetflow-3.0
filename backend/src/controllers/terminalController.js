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

module.exports = exports;
