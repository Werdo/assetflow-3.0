require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/database');
const logger = require('./utils/logger');
const { errorMiddleware, notFoundMiddleware, handleUncaughtException, handleUnhandledRejection } = require('./utils/errorHandler');
const { initializeAdminUser } = require('./utils/initAdmin');
const { iniciarTodosLosJobs } = require('./jobs');

// Agentes de Monitoreo
const healthCheckAgent = require('./agents/healthCheckAgent');
const errorLogAgent = require('./agents/errorLogAgent');
const performanceAgent = require('./agents/performanceAgent');

// Rutas
const authRoutes = require('./routes/authRoutes');
const productoRoutes = require('./routes/productoRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const emplazamientoRoutes = require('./routes/emplazamientoRoutes');
const depositoRoutes = require('./routes/depositoRoutes');
const alertaRoutes = require('./routes/alertaRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const iaRoutes = require('./routes/iaRoutes');
const adminRoutes = require('./routes/adminRoutes');
const bulkOperationsRoutes = require('./routes/bulkOperationsRoutes');

// Manejar excepciones no capturadas
handleUncaughtException();
handleUnhandledRejection();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Performance monitoring middleware (debe ir después de morgan)
app.use(performanceAgent.requestTimingMiddleware());

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AssetFlow 3.0 API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'connected'
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'AssetFlow 3.0 API',
    version: '3.0.0',
    description: 'Sistema de Control de Inventario Depositado en Emplazamientos de Clientes con IA',
    author: 'Oversun Energy',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      docs: 'Próximamente'
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/emplazamientos', emplazamientoRoutes);
app.use('/api/depositos', depositoRoutes);
app.use('/api/alertas', alertaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ia', iaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bulk', bulkOperationsRoutes);

// 404 handler
app.use(notFoundMiddleware);

// Error Log Agent middleware (debe ir antes del error handler)
app.use(errorLogAgent.expressErrorMiddleware());

// Error handler (debe ser el último middleware)
app.use(errorMiddleware);

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize admin user
    await initializeAdminUser();

    // Initialize Monitoring Agents
    const mongoose = require('mongoose');

    // Import models (esto los registra en mongoose)
    require('./models/ErrorLog');
    require('./models/PerformanceMetric');

    const ErrorLog = mongoose.model('ErrorLog');
    const PerformanceMetric = mongoose.model('PerformanceMetric');

    // Initialize agents with their models
    errorLogAgent.initialize(ErrorLog);
    performanceAgent.initialize(PerformanceMetric);

    // Start scheduled agents
    healthCheckAgent.start();
    performanceAgent.start();

    // Initialize automatic jobs
    const jobs = iniciarTodosLosJobs();

    // Start listening
    app.listen(PORT, () => {
      logger.info('========================================');
      logger.info('  AssetFlow 3.0 Backend');
      logger.info('========================================');
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/api/health`);
      logger.info(`API Endpoints:`);
      logger.info(`  - Auth:           /api/auth`);
      logger.info(`  - Productos:      /api/productos`);
      logger.info(`  - Clientes:       /api/clientes`);
      logger.info(`  - Emplazamientos: /api/emplazamientos`);
      logger.info(`  - Depositos:      /api/depositos`);
      logger.info(`  - Alertas:        /api/alertas`);
      logger.info(`  - Dashboard:      /api/dashboard`);
      logger.info(`  - IA:             /api/ia`);
      logger.info(`  - Admin:          /api/admin`);
      logger.info('========================================');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Error starting server', error);
    process.exit(1);
  }
};

startServer();
