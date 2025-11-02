/**
 * AssetFlow - Snapshots Management Page (Redesigned)
 * Complete snapshot management with simplified configuration,
 * real-time execution, download, and push to remote functionality
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

interface SnapshotFile {
  path: string;
  size: string;
  date: string;
}

interface SnapshotConfig {
  enabled: boolean;
  schedule: string;
  retention: {
    count: number;
    maxAgeDays: number;
  };
  containers?: Array<{
    name: string;
    enabled: boolean;
    includeVolumes: boolean;
  }>;
  destination: {
    path: string;
    format: string;
  };
  autoCleanup: boolean;
}

interface RemoteConfig {
  host: string;
  port: number;
  path: string;
  user: string;
  password: string;
}

export const SnapshotsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [snapshotsList, setSnapshotsList] = useState<SnapshotFile[]>([]);
  const [config, setConfig] = useState<SnapshotConfig | null>(null);
  const [executing, setExecuting] = useState(false);

  // Remote push state
  const [showPushModal, setShowPushModal] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<string>('');
  const [pushing, setPushing] = useState(false);
  const [remoteConfig, setRemoteConfig] = useState<RemoteConfig>({
    host: '',
    port: 22,
    path: '/backups/assetflow/',
    user: 'backup',
    password: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      loadConfig(),
      loadSnapshotsList()
    ]);
  };

  const loadConfig = async () => {
    try {
      const cfg = await terminalService.getConfig('snapshot');
      setConfig(cfg);
    } catch (error: any) {
      console.error('Error loading snapshot config:', error);
      toast.error('Error al cargar configuración');
    }
  };

  const loadSnapshotsList = async () => {
    setLoading(true);
    try {
      const result = await terminalService.executeCommand('snapshot-list');
      if (result.success && result.type === 'json') {
        setSnapshotsList(result.output);
      }
    } catch (error: any) {
      console.error('Error loading snapshots list:', error);
      toast.error('Error al cargar lista de snapshots');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteSnapshot = () => {
    if (!confirm('¿Ejecutar snapshot manualmente? Este proceso puede tardar varios minutos.')) {
      return;
    }
    setExecuting(true);
  };

  const handleExecutionComplete = (success: boolean) => {
    setExecuting(false);
    if (success) {
      toast.success('Snapshot completado exitosamente');
      // Reload snapshots list after a short delay
      setTimeout(() => {
        loadSnapshotsList();
      }, 2000);
    } else {
      toast.error('Error al ejecutar snapshot');
    }
  };

  const handleDownload = (filename: string) => {
    const downloadUrl = terminalService.getSnapshotDownloadUrl(filename);
    window.open(downloadUrl, '_blank');
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`¿Está seguro de que desea eliminar el snapshot "${filename}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await terminalService.deleteSnapshot(filename);
      toast.success('Snapshot eliminado exitosamente');
      await loadSnapshotsList();
    } catch (error: any) {
      console.error('Error deleting snapshot:', error);
      toast.error('Error al eliminar el snapshot');
    }
  };

  const handleShowPushModal = (filename: string) => {
    setSelectedSnapshot(filename);
    setShowPushModal(true);
  };

  const handlePushToRemote = () => {
    if (!remoteConfig.host || !remoteConfig.user || !remoteConfig.path) {
      toast.error('Configuración del servidor remoto incompleta');
      return;
    }

    if (!confirm(`¿Enviar snapshot ${selectedSnapshot} a ${remoteConfig.host}?`)) {
      return;
    }

    setPushing(true);
  };

  const handlePushComplete = (success: boolean) => {
    setPushing(false);
    if (success) {
      toast.success('Snapshot transferido exitosamente');
      setShowPushModal(false);
    } else {
      toast.error('Error al transferir snapshot');
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
                <i className="bi bi-layers-fill me-2"></i>
                Gestión de Snapshots
              </h2>
              <p className="text-muted mb-0">
                Snapshots de contenedores Docker con transferencia remota
              </p>
            </div>
            <div className="d-flex gap-2">
              {/* Configure button temporarily disabled - config structure mismatch */}
              {/*<Button
                variant="outline-secondary"
                onClick={() => setShowConfigModal(true)}
                disabled={loading || !config || executing}
              >
                <i className="bi bi-gear me-1"></i>
                Configurar
              </Button>*/}
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
                onClick={handleExecuteSnapshot}
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
                    Ejecutar Snapshot Ahora
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
                      </td>
                    </tr>
                    <tr>
                      <td className="fw-semibold">Retención</td>
                      <td>
                        {config.retention.count} snapshots / {config.retention.maxAgeDays} días máx
                      </td>
                    </tr>
                    <tr>
                      <td className="fw-semibold">Contenedores</td>
                      <td>
                        <Badge bg="info">{config.containers?.length || 0} contenedores</Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="fw-semibold">Formato</td>
                      <td>
                        <Badge bg="info">{config.destination?.format || 'tar'}</Badge>
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
                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                    <strong>Volúmenes Docker:</strong> Todos los datos persistentes
                  </li>
                  <li className="mb-2">
                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                    <strong>Configuraciones:</strong> docker-compose.yml, .env, etc.
                  </li>
                  <li className="mb-2">
                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                    <strong>Rotación Automática:</strong> Daily/Weekly/Monthly
                  </li>
                  <li className="mb-0">
                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                    <strong>Transferencia Remota:</strong> SCP/rsync a servidor externo
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
              endpoint={terminalService.getSnapshotStreamUrl()}
              isExecuting={executing}
              onComplete={handleExecutionComplete}
              title="Ejecución de Snapshot en Tiempo Real"
            />
          </Col>
        </Row>
      )}

      {/* Snapshots List */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>
                <i className="bi bi-archive me-2"></i>
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
                        <th>Archivo</th>
                        <th>Tamaño</th>
                        <th>Fecha</th>
                        <th className="text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshotsList.map((snapshot, idx) => (
                        <tr key={idx}>
                          <td>
                            <code className="small">{getFilenameFromPath(snapshot.path)}</code>
                          </td>
                          <td>
                            <Badge bg="secondary">{snapshot.size}</Badge>
                          </td>
                          <td className="text-muted small">
                            {formatDate(snapshot.date)}
                          </td>
                          <td className="text-center">
                            <Button
                              variant="outline-success"
                              size="sm"
                              className="me-2"
                              onClick={() => handleDownload(getFilenameFromPath(snapshot.path))}
                            >
                              <i className="bi bi-download me-1"></i>
                              Descargar
                            </Button>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-2"
                              onClick={() => handleShowPushModal(getFilenameFromPath(snapshot.path))}
                            >
                              <i className="bi bi-cloud-upload me-1"></i>
                              Subir
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(getFilenameFromPath(snapshot.path))}
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

      {/* Configuration Modal - Temporarily disabled due to config structure mismatch
      <Modal show={showConfigModal} onHide={() => setShowConfigModal(false)} size="lg">
        ...
      </Modal>
      */}

      {/* Push to Remote Modal */}
      <Modal show={showPushModal} onHide={() => setShowPushModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-cloud-upload me-2"></i>
            Subir Snapshot a Servidor Remoto
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            <i className="bi bi-info-circle me-2"></i>
            <strong>Archivo seleccionado:</strong> <code>{selectedSnapshot}</code>
          </Alert>

          <Form>
            <h6 className="mb-3">Configuración del Servidor Remoto</h6>
            <Row>
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label>Host / IP</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="ejemplo.com o 192.168.1.100"
                    value={remoteConfig.host}
                    onChange={(e) => setRemoteConfig({ ...remoteConfig, host: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Puerto SSH</Form.Label>
                  <Form.Control
                    type="number"
                    value={remoteConfig.port}
                    onChange={(e) => setRemoteConfig({ ...remoteConfig, port: parseInt(e.target.value) || 22 })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Ruta de Destino</Form.Label>
              <Form.Control
                type="text"
                placeholder="/backups/assetflow/"
                value={remoteConfig.path}
                onChange={(e) => setRemoteConfig({ ...remoteConfig, path: e.target.value })}
              />
              <Form.Text className="text-muted">
                Ruta absoluta en el servidor remoto donde se guardará el archivo
              </Form.Text>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Usuario SSH</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="backup"
                    value={remoteConfig.user}
                    onChange={(e) => setRemoteConfig({ ...remoteConfig, user: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Contraseña (opcional)</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Dejar vacío si usa autenticación por clave"
                    value={remoteConfig.password}
                    onChange={(e) => setRemoteConfig({ ...remoteConfig, password: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>

          {pushing && (
            <RealTimeTerminal
              endpoint={`${terminalService.getSnapshotStreamUrl().replace('/execute-stream', '/push-remote')}`}
              isExecuting={pushing}
              onComplete={handlePushComplete}
              title="Transferencia a Servidor Remoto"
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPushModal(false)} disabled={pushing}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handlePushToRemote} disabled={pushing}>
            {pushing ? (
              <>
                <Spinner animation="border" size="sm" className="me-1" />
                Transfiriendo...
              </>
            ) : (
              <>
                <i className="bi bi-cloud-upload me-1"></i>
                Iniciar Transferencia
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default SnapshotsPage;
