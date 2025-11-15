const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  exportDepositosCSV,
  exportDepositosExcel,
  exportEmplazamientosCSV,
  exportEmplazamientosExcel,
  importDepositos,
  importEmplazamientos,
  updateDepositosBulk
} = require('../controllers/bulkOperationsController');
const { protect, isAdminOrManager, isAdmin } = require('../middleware/auth');

// Configurar multer para subida de archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // Límite de 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'text/csv',
      'application/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos CSV y Excel'));
    }
  }
});

// Todas las rutas requieren autenticación
router.use(protect);

/**
 * EXPORTACIÓN DE DEPÓSITOS
 */

// @route   GET /api/bulk/depositos/export/csv
// @desc    Exportar depósitos a CSV
// @access  Private (Admin/Manager)
router.get('/depositos/export/csv', isAdminOrManager, exportDepositosCSV);

// @route   GET /api/bulk/depositos/export/excel
// @desc    Exportar depósitos a Excel
// @access  Private (Admin/Manager)
router.get('/depositos/export/excel', isAdminOrManager, exportDepositosExcel);

/**
 * EXPORTACIÓN DE EMPLAZAMIENTOS
 */

// @route   GET /api/bulk/emplazamientos/export/csv
// @desc    Exportar emplazamientos a CSV
// @access  Private (Admin/Manager)
router.get('/emplazamientos/export/csv', isAdminOrManager, exportEmplazamientosCSV);

// @route   GET /api/bulk/emplazamientos/export/excel
// @desc    Exportar emplazamientos a Excel
// @access  Private (Admin/Manager)
router.get('/emplazamientos/export/excel', isAdminOrManager, exportEmplazamientosExcel);

/**
 * IMPORTACIÓN DE DEPÓSITOS
 */

// @route   POST /api/bulk/depositos/import
// @desc    Importar depósitos desde CSV/Excel
// @access  Private (Admin/Manager)
router.post('/depositos/import', isAdminOrManager, upload.single('file'), importDepositos);

/**
 * IMPORTACIÓN DE EMPLAZAMIENTOS
 */

// @route   POST /api/bulk/emplazamientos/import
// @desc    Importar emplazamientos desde CSV/Excel
// @access  Private (Admin/Manager)
router.post('/emplazamientos/import', isAdminOrManager, upload.single('file'), importEmplazamientos);

/**
 * ACTUALIZACIÓN MASIVA
 */

// @route   PUT /api/bulk/depositos/update
// @desc    Actualización masiva de depósitos
// @access  Private (Admin/Manager)
router.put('/depositos/update', isAdminOrManager, updateDepositosBulk);

module.exports = router;
