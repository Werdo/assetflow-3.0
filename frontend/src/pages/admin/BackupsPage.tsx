/**
 * AssetFlow - Backups Configuration Page
 * Página de configuración y gestión de backups
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Table, Badge, Spinner, Modal, Form } from 'react-bootstrap';
import toast from 'react-hot-toast';
import terminalService from '../../services/terminalService';

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
  const [backupsList, setBackupsList] = useState<any[]>([]);
  const [backupStatus, setBackupStatus] = useState<string>('');
  const [executing, setExecuting] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [config, setConfig] = useState<BackupConfig | null>(null);
  const [editedConfig, setEditedConfig] = useState<BackupConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBackupsInfo();
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const cfg = await terminalService.getConfig('backup');
      setConfig(cfg);
      setEditedConfig(cfg);
    } catch (error: any) {
      console.error('Error loading backup config:', error);
      toast.error('Error al cargar configuración');
    }
  };

  const loadBackupsInfo = async () => {
    setLoading(true);
    try {
      // Load backup status
      const statusResult = await terminalService.executeCommand('backup-status');
      if (statusResult.success) {
        setBackupStatus(statusResult.output);
      }

      // Load backups list
      const listResult = await terminalService.executeCommand('backup-list');
      if (listResult.success && listResult.type === 'json') {
        setBackupsList(listResult.output);
      }
    } catch (error: any) {
      console.error('Error loading backups:', error);
      toast.error('Error al cargar información de backups');
    } finally {
      setLoading(false);
    }
  };

  const executeBackup = async () => {
    if (!confirm('¿Ejecutar backup manualmente? Este proceso puede tardar varios minutos.')) {
      return;
    }

    setExecuting(true);
    try {
      const result = await terminalService.executeCommand('backup-run');
      if (result.success) {
        toast.success('Backup ejecutado exitosamente');
        loadBackupsInfo();
      } else {
        toast.error('Error al ejecutar backup');
      }
    } catch (error: any) {
      toast.error('Error al ejecutar backup');
    } finally {
      setExecuting(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!editedConfig) return;

    setSaving(true);
    try {
      await terminalService.updateConfig('backup', editedConfig);
      toast.success('Configuración guardada exitosamente');
      setConfig(editedConfig);
      setShowConfigModal(false);
      loadConfig();
    } catch (error: any) {
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES');
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
                disabled={loading || !config}
              >
                <i className="bi bi-gear me-1"></i>
                Configurar
              </Button>
              <Button
                variant="outline-primary"
                onClick={loadBackupsInfo}
                disabled={loading || executing}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Actualizar
              </Button>
              <Button
                variant="success"
                onClick={executeBackup}
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
                <i className="bi bi-gear-fill me-2"></i>
                Configuración Actual
              </Card.Header>
              <Card.Body>
                <Table size="sm" className="mb-0">
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
                      <td>{config.schedule}</td>
                    </tr>
                    <tr>
                      <td className="fw-semibold">Retención Diaria</td>
                      <td>{config.retention.daily} backups</td>
                    </tr>
                    <tr>
                      <td className="fw-semibold">Retención Semanal</td>
                      <td>{config.retention.weekly} backups</td>
                    </tr>
                    <tr>
                      <td className="fw-semibold">Retención Mensual</td>
                      <td>{config.retention.monthly} backups</td>
                    </tr>
                    <tr>
                      <td className="fw-semibold">Compresión</td>
                      <td>
                        <Badge bg="success">{config.compression.format}</Badge>
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
                <i className="bi bi-clipboard-check me-2"></i>
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
                    <strong>Archivos de Configuración:</strong> {config.files.paths.length} archivos
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

      {/* Backup Status */}
      {backupStatus && (
        <Row className="mb-4">
          <Col>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-dark text-white">
                <i className="bi bi-file-earmark-text me-2"></i>
                Últimos Logs
              </Card.Header>
              <Card.Body>
                <pre className="mb-0 bg-dark text-light p-3 rounded" style={{ maxHeight: '300px', overflow: 'auto' }}>
                  {backupStatus}
                </pre>
              </Card.Body>
            </Card>
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
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backupsList.map((backup, idx) => (
                        <tr key={idx}>
                          <td>
                            <code className="small">{backup.path.split('/').pop()}</code>
                          </td>
                          <td>
                            <Badge bg="secondary">{backup.size}</Badge>
                          </td>
                          <td className="text-muted small">
                            {formatDate(backup.date)}
                          </td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              disabled
                              title="Función de restauración próximamente"
                            >
                              <i className="bi bi-arrow-counterclockwise me-1"></i>
                              Restaurar
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
                    <Form.Label>Estado del Sistema</Form.Label>
                    <Form.Check
                      type="switch"
                      id="backup-enabled"
                      label={editedConfig.enabled ? 'Habilitado' : 'Deshabilitado'}
                      checked={editedConfig.enabled}
                      onChange={(e) => setEditedConfig({
                        ...editedConfig,
                        enabled: e.target.checked
                      })}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Horario (cron)</Form.Label>
                    <Form.Control
                      type="text"
                      value={editedConfig.schedule}
                      onChange={(e) => setEditedConfig({
                        ...editedConfig,
                        schedule: e.target.value
                      })}
                      placeholder="0 2 * * *"
                    />
                    <Form.Text className="text-muted">
                      Formato cron: minuto hora día mes día-semana
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              <hr />

              <h6 className="mb-3">Retención de Backups</h6>
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Backups Diarios</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      value={editedConfig.retention.daily}
                      onChange={(e) => setEditedConfig({
                        ...editedConfig,
                        retention: {
                          ...editedConfig.retention,
                          daily: parseInt(e.target.value) || 7
                        }
                      })}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Backups Semanales</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      value={editedConfig.retention.weekly}
                      onChange={(e) => setEditedConfig({
                        ...editedConfig,
                        retention: {
                          ...editedConfig.retention,
                          weekly: parseInt(e.target.value) || 4
                        }
                      })}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Backups Mensuales</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      value={editedConfig.retention.monthly}
                      onChange={(e) => setEditedConfig({
                        ...editedConfig,
                        retention: {
                          ...editedConfig.retention,
                          monthly: parseInt(e.target.value) || 6
                        }
                      })}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <hr />

              <h6 className="mb-3">MongoDB</h6>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="switch"
                      id="mongodb-enabled"
                      label="Incluir MongoDB en backups"
                      checked={editedConfig.mongodb.enabled}
                      onChange={(e) => setEditedConfig({
                        ...editedConfig,
                        mongodb: {
                          ...editedConfig.mongodb,
                          enabled: e.target.checked
                        }
                      })}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Base de Datos</Form.Label>
                    <Form.Control
                      type="text"
                      value={editedConfig.mongodb.database}
                      onChange={(e) => setEditedConfig({
                        ...editedConfig,
                        mongodb: {
                          ...editedConfig.mongodb,
                          database: e.target.value
                        }
                      })}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <hr />

              <h6 className="mb-3">Compresión</h6>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="switch"
                      id="compression-enabled"
                      label="Comprimir backups"
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
                    <Form.Label>Formato</Form.Label>
                    <Form.Select
                      value={editedConfig.compression.format}
                      onChange={(e) => setEditedConfig({
                        ...editedConfig,
                        compression: {
                          ...editedConfig.compression,
                          format: e.target.value
                        }
                      })}
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
                Guardar Configuración
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default BackupsPage;
