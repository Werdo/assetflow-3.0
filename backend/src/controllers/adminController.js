const User = require('../models/User');
const Deposito = require('../models/Deposito');
const Alerta = require('../models/Alerta');
const Cliente = require('../models/Cliente');
const Emplazamiento = require('../models/Emplazamiento');
const Producto = require('../models/Producto');
const { asyncHandler } = require('../utils/errorHandler');
const { ValidationError, NotFoundError } = require('../utils/errorHandler');
const logger = require('../utils/logger');
const os = require('os');
const mongoose = require('mongoose');

/**
 * @desc    Get all users (admin only)
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
exports.getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, search, role, active } = req.query;

  const query = {};

  // Search filter
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  // Role filter
  if (role) {
    query.role = role;
  }

  // Active filter
  if (active !== undefined) {
    query.active = active === 'true';
  }

  const total = await User.countDocuments(query);
  const users = await User.find(query)
    .select('-password')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  logger.info('Admin retrieved user list', {
    adminId: req.user.id,
    totalUsers: total
  });

  res.status(200).json({
    success: true,
    message: 'Usuarios obtenidos exitosamente',
    data: {
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
});

/**
 * @desc    Get single user by ID (admin only)
 * @route   GET /api/admin/users/:id
 * @access  Private/Admin
 */
exports.getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  res.status(200).json({
    success: true,
    data: { user }
  });
});

/**
 * @desc    Create new user (admin only)
 * @route   POST /api/admin/users
 * @access  Private/Admin
 */
exports.createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role = 'user', active = true } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    throw new ValidationError('Nombre, email y contraseña son requeridos');
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ValidationError('El email ya está registrado');
  }

  // Validate password length
  if (password.length < 6) {
    throw new ValidationError('La contraseña debe tener al menos 6 caracteres');
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role,
    active
  });

  logger.info('Admin created new user', {
    adminId: req.user.id,
    newUserId: user._id,
    email: user.email,
    role: user.role
  });

  res.status(201).json({
    success: true,
    message: 'Usuario creado exitosamente',
    data: {
      user: user.toPublicJSON()
    }
  });
});

/**
 * @desc    Update user (admin only)
 * @route   PUT /api/admin/users/:id
 * @access  Private/Admin
 */
exports.updateUser = asyncHandler(async (req, res) => {
  const { name, email, role, active } = req.body;

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  // Update fields
  if (name) user.name = name;
  if (email) {
    // Check if new email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      throw new ValidationError('El email ya está en uso');
    }
    user.email = email;
  }
  if (role) user.role = role;
  if (active !== undefined) user.active = active;

  await user.save();

  logger.info('Admin updated user', {
    adminId: req.user.id,
    userId: user._id,
    changes: { name, email, role, active }
  });

  res.status(200).json({
    success: true,
    message: 'Usuario actualizado exitosamente',
    data: {
      user: user.toPublicJSON()
    }
  });
});

/**
 * @desc    Delete user (admin only)
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  // Prevent admin from deleting themselves
  if (user._id.toString() === req.user.id.toString()) {
    throw new ValidationError('No puedes eliminar tu propia cuenta');
  }

  await user.deleteOne();

  logger.warn('Admin deleted user', {
    adminId: req.user.id,
    deletedUserId: user._id,
    deletedUserEmail: user.email
  });

  res.status(200).json({
    success: true,
    message: 'Usuario eliminado exitosamente'
  });
});

/**
 * @desc    Reset user password (admin only)
 * @route   POST /api/admin/users/:id/reset-password
 * @access  Private/Admin
 */
exports.resetUserPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    throw new ValidationError('La nueva contraseña debe tener al menos 6 caracteres');
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  user.password = newPassword;
  await user.save();

  logger.info('Admin reset user password', {
    adminId: req.user.id,
    userId: user._id
  });

  res.status(200).json({
    success: true,
    message: 'Contraseña restablecida exitosamente'
  });
});

/**
 * @desc    Get system health status
 * @route   GET /api/admin/system/health
 * @access  Private/Admin
 */
exports.getSystemHealth = asyncHandler(async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',

    // Database status
    database: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      host: mongoose.connection.host,
      name: mongoose.connection.name
    },

    // Memory usage
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem(),
      usedPercentage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2),
      processUsage: process.memoryUsage()
    },

    // System info
    system: {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      loadAverage: os.loadavg(),
      hostname: os.hostname()
    }
  };

  res.status(200).json({
    success: true,
    data: health
  });
});

/**
 * @desc    Get system statistics
 * @route   GET /api/admin/system/stats
 * @access  Private/Admin
 */
exports.getSystemStats = asyncHandler(async (req, res) => {
  // Get counts from all collections
  const [
    totalUsers,
    activeUsers,
    totalClientes,
    activeClientes,
    totalEmplazamientos,
    activeEmplazamientos,
    totalProductos,
    activeProductos,
    totalDepositos,
    activeDepositos,
    totalAlertas,
    alertasPendientes
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ active: true }),
    Cliente.countDocuments(),
    Cliente.countDocuments({ activo: true }),
    Emplazamiento.countDocuments(),
    Emplazamiento.countDocuments({ estado: 'activo' }),
    Producto.countDocuments(),
    Producto.countDocuments({ activo: true }),
    Deposito.countDocuments(),
    Deposito.countDocuments({ activo: true }),
    Alerta.countDocuments(),
    Alerta.countDocuments({ resuelta: false })
  ]);

  // Get recent activity (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    newUsersLastWeek,
    newDepositosLastWeek,
    newAlertasLastWeek
  ] = await Promise.all([
    User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    Deposito.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    Alerta.countDocuments({ createdAt: { $gte: sevenDaysAgo } })
  ]);

  // Calculate total value of active deposits
  const valorTotalDepositos = await Deposito.aggregate([
    { $match: { activo: true } },
    { $group: { _id: null, total: { $sum: '$valorTotal' } } }
  ]);

  const stats = {
    users: {
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      newLastWeek: newUsersLastWeek
    },
    clientes: {
      total: totalClientes,
      active: activeClientes,
      inactive: totalClientes - activeClientes
    },
    emplazamientos: {
      total: totalEmplazamientos,
      active: activeEmplazamientos,
      inactive: totalEmplazamientos - activeEmplazamientos
    },
    productos: {
      total: totalProductos,
      active: activeProductos,
      inactive: totalProductos - activeProductos
    },
    depositos: {
      total: totalDepositos,
      active: activeDepositos,
      inactive: totalDepositos - activeDepositos,
      newLastWeek: newDepositosLastWeek,
      valorTotal: valorTotalDepositos[0]?.total || 0
    },
    alertas: {
      total: totalAlertas,
      pending: alertasPendientes,
      resolved: totalAlertas - alertasPendientes,
      newLastWeek: newAlertasLastWeek
    },
    timestamp: new Date().toISOString()
  };

  logger.info('Admin retrieved system stats', {
    adminId: req.user.id
  });

  res.status(200).json({
    success: true,
    data: stats
  });
});

/**
 * @desc    Get database collections info
 * @route   GET /api/admin/system/database
 * @access  Private/Admin
 */
exports.getDatabaseInfo = asyncHandler(async (req, res) => {
  const collections = await mongoose.connection.db.listCollections().toArray();

  const collectionStats = await Promise.all(
    collections.map(async (collection) => {
      const stats = await mongoose.connection.db.collection(collection.name).stats();
      return {
        name: collection.name,
        count: stats.count,
        size: stats.size,
        avgObjSize: stats.avgObjSize,
        storageSize: stats.storageSize,
        indexes: stats.nindexes
      };
    })
  );

  res.status(200).json({
    success: true,
    data: {
      database: mongoose.connection.name,
      collections: collectionStats,
      totalSize: collectionStats.reduce((acc, col) => acc + col.storageSize, 0),
      totalDocuments: collectionStats.reduce((acc, col) => acc + col.count, 0)
    }
  });
});
