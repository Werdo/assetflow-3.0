/**
 * AssetFlow - Backups Management Page (Redesigned)
 * Complete backup management with simplified configuration,
 * real-time execution, and download functionality
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Alert,
  Table,
  Badge,
  Spinner,
  Modal,
  Form
} from 'react-bootstrap';
import toast from 'react-hot-toast';
import terminalService from '../../services/terminalService';
import RealTimeTerminal from '../../components/admin/RealTimeTerminal';
import ScheduleSelector, { ScheduleTime, scheduleToCron, cronToSchedule } from '../../components/admin/ScheduleSelector';

interface BackupFile {
  path: string;
  size: string;
  date: string;
}

interface BackupConfig {
  enabled: boolean;
  schedule: string;
  retention: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  mongodb: {
    enabled: boolean;
    host: string;
    port: number;
    database: string;
  };
  files: {
    enabled: boolean;
    paths: string[];
  };
  compression: {
    enabled: boolean;
    format: string;
  };
}

export const BackupsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [backupsList, setBackupsList] = useState<BackupFile[]>([]);
  const [config, setConfig] = useState<BackupConfig | null>(null);
  const [editedConfig, setEditedConfig] = useState<BackupConfig | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [scheduleTime, setScheduleTime] = useState<ScheduleTime>({ hour: '02', minute: '00' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      loadConfig(),
      loadBackupsList()
    ]);
  };

  const loadConfig = async () => {
    try {
      const cfg = await terminalService.getConfig('backup');
      setConfig(cfg);
      setEditedConfig(cfg);

      // Parse schedule to ScheduleTime
      if (cfg.schedule) {
        setScheduleTime(cronToSchedule(cfg.schedule));
      }
    } catch (error: any) {
      console.error('Error loading backup config:', error);
      toast.error('Error al cargar configuración');
    }
  };

  const loadBackupsList = async () => {
    setLoading(true);
    try {
      const result = await terminalService.executeCommand('backup-list');
      if (result.success && result.type === 'json') {
        setBackupsList(result.output);
      }
    } catch (error: any) {
      console.error('Error loading backups list:', error);
      toast.error('Error al cargar lista de backups');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteBackup = () => {
    if (!confirm('¿Ejecutar backup manualmente? Este proceso puede tardar varios minutos.')) {
      return;
    }
    setExecuting(true);
  };

  const handleExecutionComplete = (success: boolean) => {
    setExecuting(false);
    if (success) {
      toast.success('Backup completado exitosamente');
      // Reload backups list after a short delay
      setTimeout(() => {
        loadBackupsList();
      }, 2000);
    } else {
      toast.error('Error al ejecutar backup');
    }
  };

  const handleSaveConfig = async () => {
    if (!editedConfig) return;

    // Update schedule from ScheduleTime
    const updatedConfig = {
      ...editedConfig,
      schedule: scheduleToCron(scheduleTime)
    };

    setSaving(true);
    try {
      await terminalService.updateConfig('backup', updatedConfig);
      toast.success('Configuración guardada y servicio reiniciado');
      setConfig(updatedConfig);
      setShowConfigModal(false);
      await loadConfig();
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = (filename: string) => {
    const downloadUrl = terminalService.getBackupDownloadUrl(filename);
    window.open(downloadUrl, '_blank');
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`¿Está seguro de que desea eliminar el backup "${filename}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await terminalService.deleteBackup(filename);
      toast.success('Backup eliminado exitosamente');
      await loadBackupsList();
    } catch (error: any) {
      console.error('Error deleting backup:', error);
      toast.error('Error al eliminar el backup');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES');
  };

  const getFilenameFromPath = (path: string) => {
    return path.split('/').pop() || path;
  };

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="fw-bold mb-1">
                <i className="bi bi-database-fill-gear me-2"></i>
                Gestión de Backups
              </h2>
              <p className="text-muted mb-0">
                Sistema automatizado de copias de seguridad
              </p>
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="outline-secondary"
                onClick={() => setShowConfigModal(true)}
                disabled={loading || !config || executing}
              >
                <i className="bi bi-gear me-1"></i>
                Configurar
              </Button>
              <Button
                variant="outline-primary"
                onClick={loadData}
                disabled={loading || executing}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Actualizar
              </Button>
              <Button
                variant="success"
                onClick={handleExecuteBackup}
                disabled={loading || executing}
              >
                {executing ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-1" />
                    Ejecutando...
                  </>
                ) : (
                  <>
                    <i className="bi bi-play-fill me-1"></i>
                    Ejecutar Backup Ahora
                  </>
                )}
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Configuration Summary */}
      {config && (
        <Row className="mb-4">
          <Col lg={6}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Header className="bg-primary text-white">
                <i className="bi bi-info-circle me-2"></i>
                Configuración Actual
              </Card.Header>
              <Card.Body>
                <Table size="sm" className="mb-0" borderless>
                  <tbody>
                    <tr>
                      <td className="fw-semibold">Estado</td>
                      <td>
                        <Badge bg={config.enabled ? 'success' : 'secondary'}>
                          {config.enabled ? 'Habilitado' : 'Deshabilitado'}
                        </Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="fw-semibold">Horario</td>
                      <td>
                        <code>{config.schedule}</code>
                        <span className="ms-2 text-muted small">
                          (diario a las {cronToSchedule(config.schedule).hour}:{cronToSchedule(config.schedule).minute})
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="fw-semibold">Retención</td>
                      <td>
                        {config.retention.daily}d / {config.retention.weekly}s / {config.retention.monthly}m
                      </td>
                    </tr>
                    <tr>
                      <td className="fw-semibold">Base de Datos</td>
                      <td>
                        <Badge bg={config.mongodb.enabled ? 'success' : 'secondary'}>
                          {config.mongodb.database}
                        </Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="fw-semibold">Compresión</td>
                      <td>
                        <Badge bg="info">{config.compression.format}</Badge>
                      </td>
                    </tr>
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={6}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Header className="bg-info text-white">
                <i className="bi bi-check2-circle me-2"></i>
                Qué se Incluye
              </Card.Header>
              <Card.Body>
                <ul className="mb-0">
                  <li className="mb-2">
                    <i className={`bi bi-check-circle-fill ${config.mongodb.enabled ? 'text-success' : 'text-secondary'} me-2`}></i>
                    <strong>Base de Datos MongoDB:</strong> {config.mongodb.database}
                  </li>
                  <li className="mb-2">
                    <i className={`bi bi-check-circle-fill ${config.files.enabled ? 'text-success' : 'text-secondary'} me-2`}></i>
                    <strong>Archivos:</strong> {config.files.paths.length} rutas configuradas
                  </li>
                  <li className="mb-2">
                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                    <strong>Rotación Automática:</strong> Daily/Weekly/Monthly
                  </li>
                  <li className="mb-0">
                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                    <strong>Logs Detallados:</strong> /var/log/assetflow/backup.log
                  </li>
                </ul>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Real-Time Terminal */}
      {executing && (
        <Row className="mb-4">
          <Col>
            <RealTimeTerminal
              endpoint={terminalService.getBackupStreamUrl()}
              isExecuting={executing}
              onComplete={handleExecutionComplete}
              title="Ejecución de Backup en Tiempo Real"
            />
          </Col>
        </Row>
      )}

      {/* Backups List */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>
                <i className="bi bi-archive me-2"></i>
                Backups Disponibles
              </span>
              <Badge bg="primary">{backupsList.length} backups</Badge>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-2 text-muted">Cargando backups...</p>
                </div>
              ) : backupsList.length === 0 ? (
                <Alert variant="info" className="mb-0">
                  <i className="bi bi-info-circle me-2"></i>
                  No hay backups disponibles. Ejecuta el primer backup usando el botón de arriba.
                </Alert>
              ) : (
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Archivo</th>
                        <th>Tamaño</th>
                        <th>Fecha</th>
                        <th className="text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backupsList.map((backup, idx) => (
                        <tr key={idx}>
                          <td>
                            <code className="small">{getFilenameFromPath(backup.path)}</code>
                          </td>
                          <td>
                            <Badge bg="secondary">{backup.size}</Badge>
                          </td>
                          <td className="text-muted small">
                            {formatDate(backup.date)}
                          </td>
                          <td className="text-center">
                            <Button
                              variant="outline-success"
                              size="sm"
                              className="me-2"
                              onClick={() => handleDownload(getFilenameFromPath(backup.path))}
                            >
                              <i className="bi bi-download me-1"></i>
                              Descargar
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(getFilenameFromPath(backup.path))}
                              disabled={loading || executing}
                            >
                              <i className="bi bi-trash me-1"></i>
                              Eliminar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Configuration Modal */}
      <Modal show={showConfigModal} onHide={() => setShowConfigModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-gear-fill me-2"></i>
            Configuración de Backups
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editedConfig && (
            <Form>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="switch"
                      id="backup-enabled"
                      label="Backups Automáticos"
                      checked={editedConfig.enabled}
                      onChange={(e) => setEditedConfig({
                        ...editedConfig,
                        enabled: e.target.checked
                      })}
                    />
                    <Form.Text className="text-muted">
                      Habilitar o deshabilitar la ejecución automática de backups
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              <hr />

              <ScheduleSelector
                value={scheduleTime}
                onChange={setScheduleTime}
                label="Horario de Ejecución Diaria"
                disabled={!editedConfig.enabled}
              />

              <hr />

              <h6 className="mb-3">Retención de Backups</h6>
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Backups Diarios</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      max="30"
                      value={editedConfig.retention.daily}
                      onChange={(e) => setEditedConfig({
                        ...editedConfig,
                        retention: {
                          ...editedConfig.retention,
                          daily: parseInt(e.target.value) || 7
                        }
                      })}
                    />
                    <Form.Text className="text-muted">Últimos N días</Form.Text>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Backups Semanales</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      max="12"
                      value={editedConfig.retention.weekly}
                      onChange={(e) => setEditedConfig({
                        ...editedConfig,
                        retention: {
                          ...editedConfig.retention,
                          weekly: parseInt(e.target.value) || 4
                        }
                      })}
                    />
                    <Form.Text className="text-muted">Últimas N semanas</Form.Text>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Backups Mensuales</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      max="24"
                      value={editedConfig.retention.monthly}
                      onChange={(e) => setEditedConfig({
                        ...editedConfig,
                        retention: {
                          ...editedConfig.retention,
                          monthly: parseInt(e.target.value) || 6
                        }
                      })}
                    />
                    <Form.Text className="text-muted">Últimos N meses</Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              <hr />

              <h6 className="mb-3">Opciones de Compresión</h6>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="switch"
                      id="compression-enabled"
                      label="Comprimir Backups"
                      checked={editedConfig.compression.enabled}
                      onChange={(e) => setEditedConfig({
                        ...editedConfig,
                        compression: {
                          ...editedConfig.compression,
                          enabled: e.target.checked
                        }
                      })}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Formato de Compresión</Form.Label>
                    <Form.Select
                      value={editedConfig.compression.format}
                      onChange={(e) => setEditedConfig({
                        ...editedConfig,
                        compression: {
                          ...editedConfig.compression,
                          format: e.target.value
                        }
                      })}
                      disabled={!editedConfig.compression.enabled}
                    >
                      <option value="tar.gz">tar.gz (gzip)</option>
                      <option value="tar.bz2">tar.bz2 (bzip2)</option>
                      <option value="zip">zip</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfigModal(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSaveConfig} disabled={saving}>
            {saving ? (
              <>
                <Spinner animation="border" size="sm" className="me-1" />
                Guardando...
              </>
            ) : (
              <>
                <i className="bi bi-save me-1"></i>
                Guardar y Aplicar
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default BackupsPage;
