const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const terminalController = require('../controllers/terminalController');
const { protect, protectDownload, isAdmin } = require('../middleware/auth');

// User Management Routes - require standard auth
router.get('/users', protect, isAdmin, adminController.getAllUsers);
router.get('/users/:id', protect, isAdmin, adminController.getUserById);
router.post('/users', protect, isAdmin, adminController.createUser);
router.put('/users/:id', protect, isAdmin, adminController.updateUser);
router.delete('/users/:id', protect, isAdmin, adminController.deleteUser);
router.post('/users/:id/reset-password', protect, isAdmin, adminController.resetUserPassword);

// System Health & Stats Routes - require standard auth
router.get('/system/health', protect, isAdmin, adminController.getSystemHealth);
router.get('/system/stats', protect, isAdmin, adminController.getSystemStats);
router.get('/system/database', protect, isAdmin, adminController.getDatabaseInfo);

// Terminal & System Management Routes - require standard auth
router.post('/terminal/execute', protect, isAdmin, terminalController.executeCommand);
router.get('/terminal/commands', protect, isAdmin, terminalController.getAllowedCommands);
router.get('/terminal/system-info', protect, isAdmin, terminalController.getSystemInfo);
router.get('/terminal/history', protect, isAdmin, terminalController.getCommandHistory);

// Configuration Routes - require standard auth
router.get('/terminal/config/:type', protect, isAdmin, terminalController.getConfig);
router.put('/terminal/config/:type', protect, isAdmin, terminalController.updateConfig);

// Download Routes - use protectDownload to accept tokens in query params
router.get('/backups/download/:filename', protectDownload, isAdmin, terminalController.downloadBackup);
router.get('/snapshots/download/:filename', protectDownload, isAdmin, terminalController.downloadSnapshot);

// Streaming Execution Routes - require standard auth
router.post('/backups/execute-stream', protect, isAdmin, terminalController.executeBackupStream);
router.post('/snapshots/execute-stream', protect, isAdmin, terminalController.executeSnapshotStream);

// Remote Push Route - require standard auth
router.post('/snapshots/push-remote', protect, isAdmin, terminalController.pushSnapshotToRemote);

module.exports = router;
