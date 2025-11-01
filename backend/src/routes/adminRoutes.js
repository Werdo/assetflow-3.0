const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const terminalController = require('../controllers/terminalController');
const { protect, isAdmin } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(protect);
router.use(isAdmin);

// User Management Routes
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.post('/users/:id/reset-password', adminController.resetUserPassword);

// System Health & Stats Routes
router.get('/system/health', adminController.getSystemHealth);
router.get('/system/stats', adminController.getSystemStats);
router.get('/system/database', adminController.getDatabaseInfo);

// Terminal & System Management Routes
router.post('/terminal/execute', terminalController.executeCommand);
router.get('/terminal/commands', terminalController.getAllowedCommands);
router.get('/terminal/system-info', terminalController.getSystemInfo);
router.get('/terminal/history', terminalController.getCommandHistory);

// Configuration Routes
router.get('/terminal/config/:type', terminalController.getConfig);
router.put('/terminal/config/:type', terminalController.updateConfig);

// Download Routes
router.get('/backups/download/:filename', terminalController.downloadBackup);
router.get('/snapshots/download/:filename', terminalController.downloadSnapshot);

// Streaming Execution Routes
router.post('/backups/execute-stream', terminalController.executeBackupStream);
router.post('/snapshots/execute-stream', terminalController.executeSnapshotStream);

// Remote Push Route
router.post('/snapshots/push-remote', terminalController.pushSnapshotToRemote);

module.exports = router;
