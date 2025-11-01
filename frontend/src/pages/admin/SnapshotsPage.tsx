/**
 * AssetFlow - Snapshots Configuration Page
 * Página de configuración y gestión de snapshots de contenedores
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Table, Badge, Spinner } from 'react-bootstrap';
import toast from 'react-hot-toast';
import terminalService from '../../services/terminalService';

export const SnapshotsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [snapshotsList, setSnapshotsList] = useState<any[]>([]);
  const [snapshotStatus, setSnapshotStatus] = useState<string>('');
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    loadSnapshotsInfo();
  }, []);

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
                <i className="bi bi-camera-fill me-2"></i>
                Gestión de Snapshots
              </h2>
              <p className="text-muted mb-0">
                Snapshots automatizados de contenedores Docker
              </p>
            </div>
            <div className="d-flex gap-2">
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
                    <td className="fw-semibold">Frecuencia</td>
                    <td>Cada 6 horas</td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Retención por Cantidad</td>
                    <td>10 snapshots</td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Retención por Edad</td>
                    <td>30 días</td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Limpieza Automática</td>
                    <td>
                      <Badge bg="success">Habilitada</Badge>
                    </td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Formato</td>
                    <td><code>tar.gz</code></td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Ubicación</td>
                    <td><code>/var/snapshots/assetflow</code></td>
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
                <div className="d-flex align-items-center">
                  <Badge bg="success" className="me-2" style={{ width: '80px' }}>
                    Backend
                  </Badge>
                  <div>
                    <div className="small">
                      <i className="bi bi-check-circle-fill text-success me-1"></i>
                      Filesystem + Volúmenes
                    </div>
                  </div>
                </div>
                <div className="d-flex align-items-center">
                  <Badge bg="primary" className="me-2" style={{ width: '80px' }}>
                    Frontend
                  </Badge>
                  <div>
                    <div className="small">
                      <i className="bi bi-check-circle-fill text-success me-1"></i>
                      Filesystem
                    </div>
                  </div>
                </div>
                <div className="d-flex align-items-center">
                  <Badge bg="success" className="me-2" style={{ width: '80px' }}>
                    MongoDB
                  </Badge>
                  <div>
                    <div className="small">
                      <i className="bi bi-check-circle-fill text-success me-1"></i>
                      Filesystem + Volúmenes
                    </div>
                  </div>
                </div>
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

      {/* Configuration File Info */}
      <Row className="mt-4">
        <Col>
          <Alert variant="warning">
            <Alert.Heading>
              <i className="bi bi-exclamation-triangle me-2"></i>
              Modificar Configuración
            </Alert.Heading>
            <p>
              Para modificar la configuración de snapshots, edita el archivo:
            </p>
            <code>/var/www/assetflow/scripts/snapshot.config.json</code>
            <hr />
            <p className="mb-0 small">
              Después de modificar la configuración, reinicia el servicio cron o ejecuta:
              <br />
              <code>bash /var/www/assetflow/scripts/install-cron.sh</code>
            </p>
          </Alert>
        </Col>
      </Row>
    </Container>
  );
};

export default SnapshotsPage;
