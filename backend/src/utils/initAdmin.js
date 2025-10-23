const User = require('../models/User');
const logger = require('./logger');

/**
 * Inicializa el usuario administrador por defecto
 */
const initializeAdminUser = async () => {
  try {
    // Verificar si ya existe un usuario admin
    const adminExists = await User.findOne({ role: 'admin' });

    if (adminExists) {
      logger.info('Usuario admin ya existe en el sistema');
      return;
    }

    // Datos del admin inicial desde .env o valores por defecto
    const adminData = {
      name: 'ppelaez',
      email: 'ppelaez@oversunenergy.com',
      password: 'bb474edf',
      role: 'admin',
      active: true
    };

    // Crear usuario admin
    const admin = await User.create(adminData);

    logger.info('Usuario admin inicial creado exitosamente', {
      userId: admin._id,
      email: admin.email,
      name: admin.name
    });

    return admin;
  } catch (error) {
    logger.error('Error al crear usuario admin inicial', error);
    throw error;
  }
};

module.exports = {
  initializeAdminUser
};
