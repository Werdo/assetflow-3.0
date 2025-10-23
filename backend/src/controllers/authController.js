const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { asyncHandler } = require('../utils/errorHandler');
const { AuthenticationError, ValidationError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * @desc    Registro de nuevo usuario
 * @route   POST /api/auth/register
 * @access  Public (pero solo admin puede crear otros admins)
 */
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  // Verificar que el email no exista
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new ValidationError('El email ya está registrado');
  }

  // Si se intenta crear un admin, verificar que el usuario actual sea admin
  if (role === 'admin' && req.user && req.user.role !== 'admin') {
    throw new ValidationError('Solo los administradores pueden crear otros administradores');
  }

  // Crear usuario
  const user = await User.create({
    name,
    email,
    password,
    role: role || 'user'
  });

  // Generar token
  const token = generateToken(user);

  logger.info('Nuevo usuario registrado', {
    userId: user._id,
    email: user.email,
    role: user.role
  });

  res.status(201).json({
    success: true,
    message: 'Usuario registrado exitosamente',
    data: {
      user: user.toPublicJSON(),
      token
    }
  });
});

/**
 * @desc    Login de usuario
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Buscar usuario (incluyendo password)
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new AuthenticationError('Credenciales inválidas');
  }

  // Verificar que el usuario esté activo
  if (!user.active) {
    throw new AuthenticationError('Usuario inactivo');
  }

  // Verificar password
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    logger.warn('Intento de login fallido', {
      email,
      ip: req.ip
    });

    throw new AuthenticationError('Credenciales inválidas');
  }

  // Generar token
  const token = generateToken(user);

  logger.info('Usuario autenticado', {
    userId: user._id,
    email: user.email,
    role: user.role,
    ip: req.ip
  });

  res.status(200).json({
    success: true,
    message: 'Login exitoso',
    data: {
      user: user.toPublicJSON(),
      token
    }
  });
});

/**
 * @desc    Obtener usuario autenticado
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new AuthenticationError('Usuario no encontrado');
  }

  res.status(200).json({
    success: true,
    data: {
      user: user.toPublicJSON()
    }
  });
});

/**
 * @desc    Actualizar perfil de usuario
 * @route   PUT /api/auth/me
 * @access  Private
 */
exports.updateMe = asyncHandler(async (req, res) => {
  const { name, email } = req.body;

  const user = await User.findById(req.user.id);

  if (!user) {
    throw new AuthenticationError('Usuario no encontrado');
  }

  // Actualizar campos permitidos
  if (name) user.name = name;
  if (email) {
    // Verificar que el nuevo email no exista
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      throw new ValidationError('El email ya está en uso');
    }
    user.email = email;
  }

  await user.save();

  logger.info('Usuario actualizado', {
    userId: user._id,
    email: user.email
  });

  res.status(200).json({
    success: true,
    message: 'Perfil actualizado exitosamente',
    data: {
      user: user.toPublicJSON()
    }
  });
});

/**
 * @desc    Cambiar contraseña
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ValidationError('Se requiere contraseña actual y nueva contraseña');
  }

  if (newPassword.length < 6) {
    throw new ValidationError('La nueva contraseña debe tener al menos 6 caracteres');
  }

  const user = await User.findById(req.user.id).select('+password');

  if (!user) {
    throw new AuthenticationError('Usuario no encontrado');
  }

  // Verificar contraseña actual
  const isPasswordValid = await user.comparePassword(currentPassword);

  if (!isPasswordValid) {
    throw new AuthenticationError('Contraseña actual incorrecta');
  }

  // Actualizar contraseña
  user.password = newPassword;
  await user.save();

  logger.info('Contraseña cambiada', {
    userId: user._id,
    email: user.email
  });

  res.status(200).json({
    success: true,
    message: 'Contraseña actualizada exitosamente'
  });
});

/**
 * @desc    Logout (invalidar token en cliente)
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = asyncHandler(async (req, res) => {
  logger.info('Usuario cerró sesión', {
    userId: req.user.id,
    email: req.user.email
  });

  res.status(200).json({
    success: true,
    message: 'Logout exitoso'
  });
});
