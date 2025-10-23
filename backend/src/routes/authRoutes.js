const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, optionalAuth } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validate');

// Rutas públicas
router.post('/register', optionalAuth, validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);

// Rutas protegidas
router.get('/me', protect, authController.getMe);
router.put('/me', protect, authController.updateMe);
router.put('/change-password', protect, authController.changePassword);
router.post('/logout', protect, authController.logout);

module.exports = router;
