/**
 * AssetFlow - Bulk Operations Page
 * Página de administración para operaciones masivas de importación y exportación
 */

import React, { useState, useRef } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Alert,
  Tabs,
  Tab,
  Table,
  Badge,
  Spinner,
  ProgressBar
} from 'react-bootstrap';
import {
  FaFileExport,
  FaFileImport,
  FaFileExcel,
  FaFileCsv,
  FaDownload,
  FaUpload,
  FaCheckCircle,
  FaExclamationTriangle
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import bulkOperationsService, { ImportResult } from '../../services/bulkOperationsService';

export const BulkOperationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('depositos-export');
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Exportar depósitos
   */
  const handleExportDepositos = async (format: 'csv' | 'excel') => {
    setLoading(true);
    try {
      const blob = format === 'csv'
        ? await bulkOperationsService.exportDepositosCSV()
        : await bulkOperationsService.exportDepositosExcel();

      const filename = `depositos_${Date.now()}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      bulkOperationsService.downloadFile(blob, filename);
      toast.success(`Depósitos exportados correctamente a ${format.toUpperCase()}`);
    } catch (error: any) {
      console.error('Error exporting depositos:', error);
      toast.error(error.response?.data?.message || 'Error al exportar depósitos');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Exportar emplazamientos
   */
  const handleExportEmplazamientos = async (format: 'csv' | 'excel') => {
    setLoading(true);
    try {
      const blob = format === 'csv'
        ? await bulkOperationsService.exportEmplazamientosCSV()
        : await bulkOperationsService.exportEmplazamientosExcel();

      const filename = `emplazamientos_${Date.now()}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      bulkOperationsService.downloadFile(blob, filename);
      toast.success(`Emplazamientos exportados correctamente a ${format.toUpperCase()}`);
    } catch (error: any) {
      console.error('Error exporting emplazamientos:', error);
      toast.error(error.response?.data?.message || 'Error al exportar emplazamientos');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Manejar selección de archivo
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      const validTypes = [
        'text/csv',
        'application/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      if (!validTypes.includes(file.type)) {
        toast.error('Formato de archivo no válido. Use CSV o Excel');
        return;
      }
      setImportFile(file);
      setImportResult(null);
    }
  };

  /**
   * Importar depósitos
   */
  const handleImportDepositos = async () => {
    if (!importFile) {
      toast.error('Por favor seleccione un archivo');
      return;
    }

    setLoading(true);
    setImportResult(null);
    try {
      const result = await bulkOperationsService.importDepositos(importFile);
      setImportResult(result);
      if (result.errors.length === 0) {
        toast.success(`Importación completada: ${result.created} creados, ${result.updated} actualizados`);
      } else {
        toast(`Importación completada con ${result.errors.length} errores`, { icon: '⚠️' });
      }
    } catch (error: any) {
      console.error('Error importing depositos:', error);
      toast.error(error.response?.data?.message || 'Error al importar depósitos');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Importar emplazamientos
   */
  const handleImportEmplazamientos = async () => {
    if (!importFile) {
      toast.error('Por favor seleccione un archivo');
      return;
    }

    setLoading(true);
    setImportResult(null);
    try {
      const result = await bulkOperationsService.importEmplazamientos(importFile);
      setImportResult(result);
      if (result.errors.length === 0) {
        toast.success(`Importación completada: ${result.created} creados, ${result.updated} actualizados`);
      } else {
        toast(`Importación completada con ${result.errors.length} errores`, { icon: '⚠️' });
      }
    } catch (error: any) {
      console.error('Error importing emplazamientos:', error);
      toast.error(error.response?.data?.message || 'Error al importar emplazamientos');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Resetear formulario de importación
   */
  const resetImportForm = () => {
    setImportFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Renderizar resultado de importación
   */
  const renderImportResult = () => {
    if (!importResult) return null;

    const successRate = importResult.total > 0
      ? ((importResult.created + importResult.updated) / importResult.total * 100).toFixed(1)
      : 0;

    return (
      <Card className="mt-4">
        <Card.Header className="bg-light">
          <h6 className="mb-0">
            <FaCheckCircle className="text-success me-2" />
            Resultado de Importación
          </h6>
        </Card.Header>
        <Card.Body>
          <Row className="mb-3">
            <Col md={3}>
              <div className="text-center">
                <div className="h3 text-primary mb-0">{importResult.total}</div>
                <small className="text-muted">Total procesados</small>
              </div>
            </Col>
            <Col md={3}>
              <div className="text-center">
                <div className="h3 text-success mb-0">{importResult.created}</div>
                <small className="text-muted">Creados</small>
              </div>
            </Col>
            <Col md={3}>
              <div className="text-center">
                <div className="h3 text-info mb-0">{importResult.updated}</div>
                <small className="text-muted">Actualizados</small>
              </div>
            </Col>
            <Col md={3}>
              <div className="text-center">
                <div className="h3 text-danger mb-0">{importResult.errors.length}</div>
                <small className="text-muted">Errores</small>
              </div>
            </Col>
          </Row>

          <ProgressBar className="mb-3">
            <ProgressBar
              variant="success"
              now={(importResult.created / importResult.total) * 100}
              key={1}
            />
            <ProgressBar
              variant="info"
              now={(importResult.updated / importResult.total) * 100}
              key={2}
            />
            <ProgressBar
              variant="danger"
              now={(importResult.errors.length / importResult.total) * 100}
              key={3}
            />
          </ProgressBar>

          <div className="text-center mb-3">
            <Badge bg="success" className="px-3 py-2">
              Tasa de éxito: {successRate}%
            </Badge>
          </div>

          {importResult.errors.length > 0 && (
            <>
              <Alert variant="warning">
                <FaExclamationTriangle className="me-2" />
                Se encontraron {importResult.errors.length} errores durante la importación
              </Alert>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Fila</th>
                      <th>Error</th>
                      <th style={{ width: '150px' }}>Código</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.errors.map((error, index) => (
                      <tr key={index}>
                        <td>{error.row}</td>
                        <td><small>{error.error}</small></td>
                        <td><small>{error.codigo || '-'}</small></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </>
          )}
        </Card.Body>
      </Card>
    );
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">Operaciones Masivas</h2>
              <p className="text-muted mb-0">
                Importación y exportación en lote de depósitos y emplazamientos
              </p>
            </div>
          </div>
        </Col>
      </Row>

      <Tabs
        activeKey={activeTab}
        onSelect={(k) => {
          setActiveTab(k || 'depositos-export');
          resetImportForm();
        }}
        className="mb-4"
      >
        {/* EXPORTACIÓN DE DEPÓSITOS */}
        <Tab eventKey="depositos-export" title={<span><FaFileExport className="me-2" />Exportar Depósitos</span>}>
          <Card>
            <Card.Header className="bg-light">
              <h5 className="mb-0">
                <FaDownload className="me-2" />
                Exportar Depósitos
              </h5>
            </Card.Header>
            <Card.Body>
              <p className="text-muted">
                Descarga todos los depósitos del sistema en formato CSV o Excel. El archivo incluirá
                información completa de producto, emplazamiento, cliente, fechas, cantidades y más.
              </p>

              <Alert variant="info">
                <strong>Nota:</strong> El archivo exportado puede ser modificado y reimportado
                para actualizar datos masivamente.
              </Alert>

              <div className="d-flex gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => handleExportDepositos('excel')}
                  disabled={loading}
                >
                  {loading ? (
                    <Spinner animation="border" size="sm" className="me-2" />
                  ) : (
                    <FaFileExcel className="me-2" />
                  )}
                  Exportar a Excel
                </Button>
                <Button
                  variant="outline-primary"
                  size="lg"
                  onClick={() => handleExportDepositos('csv')}
                  disabled={loading}
                >
                  {loading ? (
                    <Spinner animation="border" size="sm" className="me-2" />
                  ) : (
                    <FaFileCsv className="me-2" />
                  )}
                  Exportar a CSV
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Tab>

        {/* IMPORTACIÓN DE DEPÓSITOS */}
        <Tab eventKey="depositos-import" title={<span><FaFileImport className="me-2" />Importar Depósitos</span>}>
          <Card>
            <Card.Header className="bg-light">
              <h5 className="mb-0">
                <FaUpload className="me-2" />
                Importar Depósitos
              </h5>
            </Card.Header>
            <Card.Body>
              <p className="text-muted">
                Importa depósitos masivamente desde un archivo CSV o Excel. Puede crear nuevos
                depósitos o actualizar existentes basándose en el número de depósito.
              </p>

              <Alert variant="warning">
                <strong>Importante:</strong> El archivo debe seguir el formato de la plantilla
                exportada. Los códigos de producto, emplazamiento y cliente deben existir en el sistema.
              </Alert>

              <Form.Group className="mb-3">
                <Form.Label>Seleccionar archivo (CSV o Excel)</Form.Label>
                <Form.Control
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                />
                {importFile && (
                  <Form.Text className="text-success">
                    <FaCheckCircle className="me-1" />
                    Archivo seleccionado: {importFile.name} ({(importFile.size / 1024).toFixed(2)} KB)
                  </Form.Text>
                )}
              </Form.Group>

              <div className="d-flex gap-3">
                <Button
                  variant="success"
                  size="lg"
                  onClick={handleImportDepositos}
                  disabled={!importFile || loading}
                >
                  {loading ? (
                    <Spinner animation="border" size="sm" className="me-2" />
                  ) : (
                    <FaUpload className="me-2" />
                  )}
                  Importar Depósitos
                </Button>
                {importFile && (
                  <Button
                    variant="outline-secondary"
                    size="lg"
                    onClick={resetImportForm}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                )}
              </div>

              {renderImportResult()}
            </Card.Body>
          </Card>
        </Tab>

        {/* EXPORTACIÓN DE EMPLAZAMIENTOS */}
        <Tab eventKey="emplazamientos-export" title={<span><FaFileExport className="me-2" />Exportar Emplazamientos</span>}>
          <Card>
            <Card.Header className="bg-light">
              <h5 className="mb-0">
                <FaDownload className="me-2" />
                Exportar Emplazamientos
              </h5>
            </Card.Header>
            <Card.Body>
              <p className="text-muted">
                Descarga todos los emplazamientos del sistema en formato CSV o Excel. El archivo incluirá
                información completa de ubicación, cliente, coordenadas, contacto y más.
              </p>

              <Alert variant="info">
                <strong>Nota:</strong> El archivo exportado puede ser modificado y reimportado
                para actualizar datos masivamente.
              </Alert>

              <div className="d-flex gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => handleExportEmplazamientos('excel')}
                  disabled={loading}
                >
                  {loading ? (
                    <Spinner animation="border" size="sm" className="me-2" />
                  ) : (
                    <FaFileExcel className="me-2" />
                  )}
                  Exportar a Excel
                </Button>
                <Button
                  variant="outline-primary"
                  size="lg"
                  onClick={() => handleExportEmplazamientos('csv')}
                  disabled={loading}
                >
                  {loading ? (
                    <Spinner animation="border" size="sm" className="me-2" />
                  ) : (
                    <FaFileCsv className="me-2" />
                  )}
                  Exportar a CSV
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Tab>

        {/* IMPORTACIÓN DE EMPLAZAMIENTOS */}
        <Tab eventKey="emplazamientos-import" title={<span><FaFileImport className="me-2" />Importar Emplazamientos</span>}>
          <Card>
            <Card.Header className="bg-light">
              <h5 className="mb-0">
                <FaUpload className="me-2" />
                Importar Emplazamientos
              </h5>
            </Card.Header>
            <Card.Body>
              <p className="text-muted">
                Importa emplazamientos masivamente desde un archivo CSV o Excel. Puede crear nuevos
                emplazamientos o actualizar existentes basándose en el código del emplazamiento.
              </p>

              <Alert variant="warning">
                <strong>Importante:</strong> El archivo debe seguir el formato de la plantilla
                exportada. Los códigos de cliente deben existir en el sistema. Las coordenadas
                deben ser válidas (longitud y latitud).
              </Alert>

              <Form.Group className="mb-3">
                <Form.Label>Seleccionar archivo (CSV o Excel)</Form.Label>
                <Form.Control
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                />
                {importFile && (
                  <Form.Text className="text-success">
                    <FaCheckCircle className="me-1" />
                    Archivo seleccionado: {importFile.name} ({(importFile.size / 1024).toFixed(2)} KB)
                  </Form.Text>
                )}
              </Form.Group>

              <div className="d-flex gap-3">
                <Button
                  variant="success"
                  size="lg"
                  onClick={handleImportEmplazamientos}
                  disabled={!importFile || loading}
                >
                  {loading ? (
                    <Spinner animation="border" size="sm" className="me-2" />
                  ) : (
                    <FaUpload className="me-2" />
                  )}
                  Importar Emplazamientos
                </Button>
                {importFile && (
                  <Button
                    variant="outline-secondary"
                    size="lg"
                    onClick={resetImportForm}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                )}
              </div>

              {renderImportResult()}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default BulkOperationsPage;
