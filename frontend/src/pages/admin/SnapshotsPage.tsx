/**
 * AssetFlow - Snapshots Configuration Page
 * Página de configuración y gestión de snapshots de contenedores
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Table, Badge, Spinner, Modal, Form } from 'react-bootstrap';
import toast from 'react-hot-toast';
import terminalService from '../../services/terminalService';

interface ContainerConfig {
  name: string;
  enabled: boolean;
  includeVolumes: boolean;
}

interface SnapshotConfig {
  enabled: boolean;
  schedule: string;
  containers: ContainerConfig[];
  retention: {
    count: number;
    maxAgeDays: number;
  };
  autoCleanup: boolean;
}

export const SnapshotsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [snapshotsList, setSnapshotsList] = useState<any[]>([]);
  const [snapshotStatus, setSnapshotStatus] = useState<string>('');
  const [executing, setExecuting] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [config, setConfig] = useState<SnapshotConfig | null>(null);
  const [editedConfig, setEditedConfig] = useState<SnapshotConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSnapshotsInfo();
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const cfg = await terminalService.getConfig('snapshot');
      setConfig(cfg);
      setEditedConfig(cfg);
    } catch (error: any) {
      console.error('Error loading snapshot config:', error);
      toast.error('Error al cargar configuración');
    }
  };

  const loadSnapshotsInfo = async () => {
    setLoading(true);
    try {
      // Load snapshot status
      const statusResult = await terminalService.executeCommand('snapshot-status');
      if (statusResult.success) {
        setSnapshotStatus(statusResult.output);
      }

      // Load snapshots list
      const listResult = await terminalService.executeCommand('snapshot-list');
      if (listResult.success && listResult.type === 'json') {
        setSnapshotsList(listResult.output);
      }
    } catch (error: any) {
      console.error('Error loading snapshots:', error);
      toast.error('Error al cargar información de snapshots');
    } finally {
      setLoading(false);
    }
  };

  const executeSnapshot = async () => {
    if (!confirm('¿Crear snapshots de los contenedores? Este proceso puede tardar varios minutos.')) {
      return;
    }

    setExecuting(true);
    try {
      const result = await terminalService.executeCommand('snapshot-run');
      if (result.success) {
        toast.success('Snapshots creados exitosamente');
        loadSnapshotsInfo();
      } else {
        toast.error('Error al crear snapshots');
      }
    } catch (error: any) {
      toast.error('Error al crear snapshots');
    } finally {
      setExecuting(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!editedConfig) return;

    setSaving(true);
    try {
      await terminalService.updateConfig('snapshot', editedConfig);
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

  const updateContainer = (index: number, field: keyof ContainerConfig, value: any) => {
    if (!editedConfig) return;
    const newContainers = [...editedConfig.containers];
    newContainers[index] = { ...newContainers[index], [field]: value };
    setEditedConfig({ ...editedConfig, containers: newContainers });
  };

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="fw-bold mb-1">
                <i className="bi bi-camera-fill me-2"></i>
                Gestión de Snapshots
              </h2>
              <p className="text-muted mb-0">
                Snapshots automatizados de contenedores Docker
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
                onClick={loadSnapshotsInfo}
                disabled={loading || executing}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Actualizar
              </Button>
              <Button
                variant="success"
                onClick={executeSnapshot}
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
                    Crear Snapshot Ahora
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
                      <td className="fw-semibold">Frecuencia</td>
                      <td>{config.schedule}</td>
                    </tr>
                    <tr>
                      <td className="fw-semibold">Retención por Cantidad</td>
                      <td>{config.retention.count} snapshots</td>
                    </tr>
                    <tr>
                      <td className="fw-semibold">Retención por Edad</td>
                      <td>{config.retention.maxAgeDays} días</td>
                    </tr>
                    <tr>
                      <td className="fw-semibold">Limpieza Automática</td>
                      <td>
                        <Badge bg={config.autoCleanup ? 'success' : 'secondary'}>
                          {config.autoCleanup ? 'Habilitada' : 'Deshabilitada'}
                        </Badge>
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
                <i className="bi bi-box-seam me-2"></i>
                Contenedores Incluidos
              </Card.Header>
              <Card.Body>
                <div className="d-flex flex-column gap-3">
                  {config.containers.map((container, idx) => (
                    <div key={idx} className="d-flex align-items-center">
                      <Badge
                        bg={container.enabled ? 'success' : 'secondary'}
                        className="me-2"
                        style={{ width: '120px' }}
                      >
                        {container.name}
                      </Badge>
                      <div>
                        <div className="small">
                          {container.enabled ? (
                            <>
                              <i className="bi bi-check-circle-fill text-success me-1"></i>
                              {container.includeVolumes ? 'Filesystem + Volúmenes' : 'Filesystem'}
                            </>
                          ) : (
                            <span className="text-muted">Deshabilitado</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <hr />
                <div className="small text-muted">
                  <i className="bi bi-info-circle me-1"></i>
                  Los snapshots incluyen el estado completo del contenedor y metadata.
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Snapshot Status */}
      {snapshotStatus && (
        <Row className="mb-4">
          <Col>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-dark text-white">
                <i className="bi bi-file-earmark-text me-2"></i>
                Últimos Logs
              </Card.Header>
              <Card.Body>
                <pre className="mb-0 bg-dark text-light p-3 rounded" style={{ maxHeight: '300px', overflow: 'auto' }}>
                  {snapshotStatus}
                </pre>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Snapshots List */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>
                <i className="bi bi-images me-2"></i>
                Snapshots Disponibles
              </span>
              <Badge bg="primary">{snapshotsList.length} snapshots</Badge>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-2 text-muted">Cargando snapshots...</p>
                </div>
              ) : snapshotsList.length === 0 ? (
                <Alert variant="info" className="mb-0">
                  <i className="bi bi-info-circle me-2"></i>
                  No hay snapshots disponibles. Ejecuta el primer snapshot usando el botón de arriba.
                </Alert>
              ) : (
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Contenedor</th>
                        <th>Archivo</th>
                        <th>Tamaño</th>
                        <th>Fecha</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshotsList.map((snapshot, idx) => {
                        const filename = snapshot.path.split('/').pop();
                        const containerName = filename.split('_')[0];
                        return (
                          <tr key={idx}>
                            <td>
                              <Badge bg={
                                containerName.includes('backend') ? 'success' :
                                containerName.includes('frontend') ? 'primary' :
                                containerName.includes('mongodb') ? 'success' : 'secondary'
                              }>
                                {containerName}
                              </Badge>
                            </td>
                            <td>
                              <code className="small">{filename}</code>
                            </td>
                            <td>
                              <Badge bg="secondary">{snapshot.size}</Badge>
                            </td>
                            <td className="text-muted small">
                              {formatDate(snapshot.date)}
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
                        );
                      })}
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
            Configuración de Snapshots
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
                      id="snapshot-enabled"
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
                    <Form.Label>Frecuencia (cron)</Form.Label>
                    <Form.Control
                      type="text"
                      value={editedConfig.schedule}
                      onChange={(e) => setEditedConfig({
                        ...editedConfig,
                        schedule: e.target.value
                      })}
                      placeholder="0 */6 * * *"
                    />
                    <Form.Text className="text-muted">
                      Formato cron: minuto hora día mes día-semana
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              <hr />

              <h6 className="mb-3">Retención de Snapshots</h6>
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Cantidad Máxima</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      value={editedConfig.retention.count}
                      onChange={(e) => setEditedConfig({
                        ...editedConfig,
                        retention: {
                          ...editedConfig.retention,
                          count: parseInt(e.target.value) || 10
                        }
                      })}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Edad Máxima (días)</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      value={editedConfig.retention.maxAgeDays}
                      onChange={(e) => setEditedConfig({
                        ...editedConfig,
                        retention: {
                          ...editedConfig.retention,
                          maxAgeDays: parseInt(e.target.value) || 30
                        }
                      })}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Limpieza Automática</Form.Label>
                    <Form.Check
                      type="switch"
                      id="auto-cleanup"
                      label={editedConfig.autoCleanup ? 'Habilitada' : 'Deshabilitada'}
                      checked={editedConfig.autoCleanup}
                      onChange={(e) => setEditedConfig({
                        ...editedConfig,
                        autoCleanup: e.target.checked
                      })}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <hr />

              <h6 className="mb-3">Contenedores</h6>
              {editedConfig.containers.map((container, idx) => (
                <Card key={idx} className="mb-3">
                  <Card.Body>
                    <Row>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Nombre del Contenedor</Form.Label>
                          <Form.Control
                            type="text"
                            value={container.name}
                            onChange={(e) => updateContainer(idx, 'name', e.target.value)}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Estado</Form.Label>
                          <Form.Check
                            type="switch"
                            id={`container-${idx}-enabled`}
                            label={container.enabled ? 'Habilitado' : 'Deshabilitado'}
                            checked={container.enabled}
                            onChange={(e) => updateContainer(idx, 'enabled', e.target.checked)}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Incluir Volúmenes</Form.Label>
                          <Form.Check
                            type="switch"
                            id={`container-${idx}-volumes`}
                            label={container.includeVolumes ? 'Sí' : 'No'}
                            checked={container.includeVolumes}
                            onChange={(e) => updateContainer(idx, 'includeVolumes', e.target.checked)}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              ))}
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

export default SnapshotsPage;
