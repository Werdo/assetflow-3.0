/**
 * AssetFlow 3.0 - Admin System Health & Stats Page
 * Real-time system monitoring and statistics
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Spinner, Alert, Button, Table, ProgressBar } from 'react-bootstrap';
import toast from 'react-hot-toast';
import adminService, { SystemHealth, SystemStats } from '../../services/adminService';

export const SystemPage: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  /**
   * Load system health
   */
  const loadSystemHealth = async () => {
    try {
      setLoadingHealth(true);
      const data = await adminService.getSystemHealth();
      setHealth(data);
      setLastUpdate(new Date());
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar estado del sistema');
    } finally {
      setLoadingHealth(false);
    }
  };

  /**
   * Load system statistics
   */
  const loadSystemStats = async () => {
    try {
      setLoadingStats(true);
      const data = await adminService.getSystemStats();
      setStats(data);
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar estadísticas');
    } finally {
      setLoadingStats(false);
    }
  };

  /**
   * Refresh all data
   */
  const refreshData = () => {
    toast.promise(
      Promise.all([loadSystemHealth(), loadSystemStats()]),
      {
        loading: 'Actualizando datos...',
        success: 'Datos actualizados',
        error: 'Error al actualizar',
      }
    );
  };

  useEffect(() => {
    loadSystemHealth();
    loadSystemStats();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadSystemHealth();
      loadSystemStats();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Format bytes to human readable
   */
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  /**
   * Format uptime to human readable
   */
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  /**
   * Format currency
   */
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="fw-bold mb-1">Estado del Sistema</h2>
              <p className="text-muted mb-0">
                Monitoreo en tiempo real del sistema - Última actualización: {lastUpdate.toLocaleTimeString('es-ES')}
              </p>
            </div>
            <Button variant="primary" onClick={refreshData}>
              <i className="bi bi-arrow-clockwise me-2"></i>
              Actualizar
            </Button>
          </div>
        </Col>
      </Row>

      {/* System Health Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="shadow-sm h-100">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <p className="text-muted mb-1 small">Estado del Sistema</p>
                  {loadingHealth ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <Badge bg={health?.status === 'healthy' ? 'success' : 'danger'} className="fs-6">
                      {health?.status === 'healthy' ? 'Operativo' : 'Error'}
                    </Badge>
                  )}
                </div>
                <div className="bg-success bg-opacity-10 p-3 rounded">
                  <i className="bi bi-check-circle-fill text-success fs-3"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="shadow-sm h-100">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <p className="text-muted mb-1 small">Base de Datos</p>
                  {loadingHealth ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <Badge bg={health?.database.status === 'connected' ? 'success' : 'danger'} className="fs-6">
                      {health?.database.status === 'connected' ? 'Conectada' : 'Desconectada'}
                    </Badge>
                  )}
                </div>
                <div className="bg-info bg-opacity-10 p-3 rounded">
                  <i className="bi bi-database-fill text-info fs-3"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="shadow-sm h-100">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <p className="text-muted mb-1 small">Tiempo Activo</p>
                  {loadingHealth ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <h4 className="mb-0 fw-bold">{formatUptime(health?.uptime || 0)}</h4>
                  )}
                </div>
                <div className="bg-primary bg-opacity-10 p-3 rounded">
                  <i className="bi bi-clock-history text-primary fs-3"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="shadow-sm h-100">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <p className="text-muted mb-1 small">Entorno</p>
                  {loadingHealth ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <Badge bg="info" className="fs-6 text-uppercase">
                      {health?.environment || 'N/A'}
                    </Badge>
                  )}
                </div>
                <div className="bg-warning bg-opacity-10 p-3 rounded">
                  <i className="bi bi-gear-fill text-warning fs-3"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Memory & System Info */}
      <Row className="mb-4">
        <Col md={6}>
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-white">
              <h5 className="mb-0">
                <i className="bi bi-memory me-2"></i>
                Uso de Memoria
              </h5>
            </Card.Header>
            <Card.Body>
              {loadingHealth ? (
                <div className="text-center py-4">
                  <Spinner animation="border" variant="primary" />
                </div>
              ) : health ? (
                <>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span>Memoria Total:</span>
                      <strong>{formatBytes(health.memory.total)}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Memoria Usada:</span>
                      <strong>{formatBytes(health.memory.used)}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Memoria Libre:</span>
                      <strong>{formatBytes(health.memory.free)}</strong>
                    </div>
                  </div>
                  <ProgressBar
                    now={parseFloat(health.memory.usedPercentage)}
                    label={`${health.memory.usedPercentage}%`}
                    variant={
                      parseFloat(health.memory.usedPercentage) > 90
                        ? 'danger'
                        : parseFloat(health.memory.usedPercentage) > 75
                        ? 'warning'
                        : 'success'
                    }
                  />
                </>
              ) : (
                <Alert variant="warning">No se pudo cargar información de memoria</Alert>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-white">
              <h5 className="mb-0">
                <i className="bi bi-cpu me-2"></i>
                Información del Sistema
              </h5>
            </Card.Header>
            <Card.Body>
              {loadingHealth ? (
                <div className="text-center py-4">
                  <Spinner animation="border" variant="primary" />
                </div>
              ) : health ? (
                <div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Plataforma:</span>
                    <strong className="text-uppercase">{health.system.platform}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Arquitectura:</span>
                    <strong>{health.system.arch}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>CPUs:</span>
                    <strong>{health.system.cpus} núcleos</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Hostname:</span>
                    <strong>{health.system.hostname}</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Base de Datos:</span>
                    <strong>{health.database.name}</strong>
                  </div>
                </div>
              ) : (
                <Alert variant="warning">No se pudo cargar información del sistema</Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* System Statistics */}
      <Row>
        <Col>
          <Card className="shadow-sm">
            <Card.Header className="bg-white">
              <h5 className="mb-0">
                <i className="bi bi-bar-chart-fill me-2"></i>
                Estadísticas del Sistema
              </h5>
            </Card.Header>
            <Card.Body>
              {loadingStats ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3 text-muted">Cargando estadísticas...</p>
                </div>
              ) : stats ? (
                <Row>
                  <Col md={4}>
                    <div className="mb-4">
                      <h6 className="text-muted mb-3">Usuarios</h6>
                      <Table size="sm" bordered>
                        <tbody>
                          <tr>
                            <td>Total</td>
                            <td className="text-end"><strong>{stats.users.total}</strong></td>
                          </tr>
                          <tr>
                            <td>Activos</td>
                            <td className="text-end"><Badge bg="success">{stats.users.active}</Badge></td>
                          </tr>
                          <tr>
                            <td>Inactivos</td>
                            <td className="text-end"><Badge bg="secondary">{stats.users.inactive}</Badge></td>
                          </tr>
                          <tr>
                            <td>Nuevos (7 días)</td>
                            <td className="text-end"><Badge bg="info">{stats.users.newLastWeek}</Badge></td>
                          </tr>
                        </tbody>
                      </Table>
                    </div>

                    <div className="mb-4">
                      <h6 className="text-muted mb-3">Clientes</h6>
                      <Table size="sm" bordered>
                        <tbody>
                          <tr>
                            <td>Total</td>
                            <td className="text-end"><strong>{stats.clientes.total}</strong></td>
                          </tr>
                          <tr>
                            <td>Activos</td>
                            <td className="text-end"><Badge bg="success">{stats.clientes.active}</Badge></td>
                          </tr>
                        </tbody>
                      </Table>
                    </div>
                  </Col>

                  <Col md={4}>
                    <div className="mb-4">
                      <h6 className="text-muted mb-3">Depósitos</h6>
                      <Table size="sm" bordered>
                        <tbody>
                          <tr>
                            <td>Total</td>
                            <td className="text-end"><strong>{stats.depositos.total}</strong></td>
                          </tr>
                          <tr>
                            <td>Activos</td>
                            <td className="text-end"><Badge bg="success">{stats.depositos.active}</Badge></td>
                          </tr>
                          <tr>
                            <td>Nuevos (7 días)</td>
                            <td className="text-end"><Badge bg="info">{stats.depositos.newLastWeek}</Badge></td>
                          </tr>
                          <tr>
                            <td>Valor Total</td>
                            <td className="text-end"><strong className="text-success">{formatCurrency(stats.depositos.valorTotal)}</strong></td>
                          </tr>
                        </tbody>
                      </Table>
                    </div>

                    <div className="mb-4">
                      <h6 className="text-muted mb-3">Emplazamientos</h6>
                      <Table size="sm" bordered>
                        <tbody>
                          <tr>
                            <td>Total</td>
                            <td className="text-end"><strong>{stats.emplazamientos.total}</strong></td>
                          </tr>
                          <tr>
                            <td>Activos</td>
                            <td className="text-end"><Badge bg="success">{stats.emplazamientos.active}</Badge></td>
                          </tr>
                        </tbody>
                      </Table>
                    </div>
                  </Col>

                  <Col md={4}>
                    <div className="mb-4">
                      <h6 className="text-muted mb-3">Alertas</h6>
                      <Table size="sm" bordered>
                        <tbody>
                          <tr>
                            <td>Total</td>
                            <td className="text-end"><strong>{stats.alertas.total}</strong></td>
                          </tr>
                          <tr>
                            <td>Pendientes</td>
                            <td className="text-end"><Badge bg="warning">{stats.alertas.pending}</Badge></td>
                          </tr>
                          <tr>
                            <td>Resueltas</td>
                            <td className="text-end"><Badge bg="success">{stats.alertas.resolved}</Badge></td>
                          </tr>
                          <tr>
                            <td>Nuevas (7 días)</td>
                            <td className="text-end"><Badge bg="info">{stats.alertas.newLastWeek}</Badge></td>
                          </tr>
                        </tbody>
                      </Table>
                    </div>

                    <div className="mb-4">
                      <h6 className="text-muted mb-3">Productos</h6>
                      <Table size="sm" bordered>
                        <tbody>
                          <tr>
                            <td>Total</td>
                            <td className="text-end"><strong>{stats.productos.total}</strong></td>
                          </tr>
                          <tr>
                            <td>Activos</td>
                            <td className="text-end"><Badge bg="success">{stats.productos.active}</Badge></td>
                          </tr>
                        </tbody>
                      </Table>
                    </div>
                  </Col>
                </Row>
              ) : (
                <Alert variant="warning">No se pudieron cargar las estadísticas</Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default SystemPage;
