/**
 * AssetFlow - Backups Configuration Page
 * Página de configuración y gestión de backups
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Table, Badge, Spinner } from 'react-bootstrap';
import toast from 'react-hot-toast';
import terminalService from '../../services/terminalService';

export const BackupsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [backupsList, setBackupsList] = useState<any[]>([]);
  const [backupStatus, setBackupStatus] = useState<string>('');
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    loadBackupsInfo();
  }, []);

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
                    <td className="fw-semibold">Horario</td>
                    <td>2:00 AM diariamente</td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Retención Diaria</td>
                    <td>7 backups</td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Retención Semanal</td>
                    <td>4 backups</td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Retención Mensual</td>
                    <td>6 backups</td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Compresión</td>
                    <td>
                      <Badge bg="success">Habilitada (tar.gz)</Badge>
                    </td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Ubicación</td>
                    <td><code>/var/backups/assetflow</code></td>
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
                  <i className="bi bi-check-circle-fill text-success me-2"></i>
                  <strong>Base de Datos MongoDB:</strong> Todos los datos del sistema
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle-fill text-success me-2"></i>
                  <strong>Archivos de Configuración:</strong> .env, docker-compose.yml
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

      {/* Configuration File Info */}
      <Row className="mt-4">
        <Col>
          <Alert variant="warning">
            <Alert.Heading>
              <i className="bi bi-exclamation-triangle me-2"></i>
              Modificar Configuración
            </Alert.Heading>
            <p>
              Para modificar la configuración de backups, edita el archivo:
            </p>
            <code>/var/www/assetflow/scripts/backup.config.json</code>
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

export default BackupsPage;
