/**
 * AssetFlow 3.0 - Alertas Page
 * Página completa de gestión de alertas del sistema
 */

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, Modal, Spinner, Alert } from 'react-bootstrap';
import { alertaService } from '../../services/alertaService';
import type { Alerta } from '../../types';
import toast from 'react-hot-toast';

export const AlertasPage: React.FC = () => {
  // Estados principales
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAlertas, setTotalAlertas] = useState(0);
  const itemsPerPage = 10;

  // Filtros
  const [filtros, setFiltros] = useState({
    tipo: '',
    prioridad: '',
    resuelta: '',
    depositoAfectado: '',
    sortBy: 'fechaCreacion',
    order: 'desc' as 'asc' | 'desc'
  });

  // Modales
  const [showResolverModal, setShowResolverModal] = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [alertaSeleccionada, setAlertaSeleccionada] = useState<Alerta | null>(null);
  const [observaciones, setObservaciones] = useState('');

  // Alertas seleccionadas para resolver múltiples
  const [alertasSeleccionadas, setAlertasSeleccionadas] = useState<string[]>([]);

  // Estadísticas
  const [estadisticas, setEstadisticas] = useState<any>(null);

  // Cargar alertas
  const cargarAlertas = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
        sortBy: filtros.sortBy,
        order: filtros.order
      };

      if (filtros.tipo) params.tipo = filtros.tipo;
      if (filtros.prioridad) params.prioridad = filtros.prioridad;
      if (filtros.resuelta !== '') params.resuelta = filtros.resuelta === 'true';
      if (filtros.depositoAfectado) params.depositoAfectado = filtros.depositoAfectado;

      const data = await alertaService.getAll(params);
      setAlertas(data.alertas);
      setTotalPages(data.pagination.pages);
      setTotalAlertas(data.pagination.total);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cargar estadísticas
  const cargarEstadisticas = async () => {
    try {
      const stats = await alertaService.getEstadisticas();
      setEstadisticas(stats);
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    }
  };

  useEffect(() => {
    cargarAlertas();
    cargarEstadisticas();
  }, [currentPage, filtros]);

  // Generar alertas automáticas
  const handleGenerarAutomaticas = async () => {
    try {
      const result = await alertaService.generarAutomaticas();
      toast.success(`${result.generadas} alertas generadas automáticamente`);
      cargarAlertas();
      cargarEstadisticas();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Resolver alerta individual
  const handleResolverAlerta = async () => {
    if (!alertaSeleccionada) return;

    try {
      await alertaService.resolver(alertaSeleccionada._id, { observaciones });
      toast.success('Alerta resuelta correctamente');
      setShowResolverModal(false);
      setObservaciones('');
      setAlertaSeleccionada(null);
      cargarAlertas();
      cargarEstadisticas();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Resolver múltiples alertas
  const handleResolverMultiples = async () => {
    if (alertasSeleccionadas.length === 0) {
      toast.error('Debes seleccionar al menos una alerta');
      return;
    }

    try {
      await alertaService.resolverMultiples({
        alertaIds: alertasSeleccionadas,
        observaciones: 'Resueltas en grupo'
      });
      toast.success(`${alertasSeleccionadas.length} alertas resueltas`);
      setAlertasSeleccionadas([]);
      cargarAlertas();
      cargarEstadisticas();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Eliminar alerta
  const handleEliminarAlerta = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta alerta?')) return;

    try {
      await alertaService.delete(id);
      toast.success('Alerta eliminada correctamente');
      cargarAlertas();
      cargarEstadisticas();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Toggle selección de alerta
  const toggleSeleccionAlerta = (id: string) => {
    setAlertasSeleccionadas(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  // Abrir modal resolver
  const abrirModalResolver = (alerta: Alerta) => {
    setAlertaSeleccionada(alerta);
    setShowResolverModal(true);
  };

  // Abrir modal detalle
  const abrirModalDetalle = (alerta: Alerta) => {
    setAlertaSeleccionada(alerta);
    setShowDetalleModal(true);
  };

  // Formatear fecha
  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-ES');
  };

  // Badge para prioridad
  const getBadgePrioridad = (prioridad: string) => {
    const badges: any = {
      baja: 'secondary',
      media: 'warning',
      alta: 'danger'
    };
    return <Badge bg={badges[prioridad] || 'secondary'}>{prioridad.toUpperCase()}</Badge>;
  };

  // Badge para tipo
  const getBadgeTipo = (tipo: string) => {
    const badges: any = {
      stock: 'info',
      vencimiento: 'warning',
      critica: 'danger',
      manual: 'primary'
    };
    return <Badge bg={badges[tipo] || 'secondary'}>{tipo}</Badge>;
  };

  // Badge para estado
  const getBadgeEstado = (resuelta: boolean) => {
    return resuelta ?
      <Badge bg="success">Resuelta</Badge> :
      <Badge bg="warning">Pendiente</Badge>;
  };

  // Renderizar estadísticas
  const renderEstadisticas = () => {
    if (!estadisticas) return null;

    return (
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-primary">{estadisticas.total || 0}</h3>
              <p className="text-muted mb-0">Total Alertas</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-warning">{estadisticas.pendientes || 0}</h3>
              <p className="text-muted mb-0">Pendientes</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-danger">{estadisticas.criticas || 0}</h3>
              <p className="text-muted mb-0">Críticas</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-success">{estadisticas.resueltas || 0}</h3>
              <p className="text-muted mb-0">Resueltas</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    );
  };

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <h2>
            <i className="bi bi-exclamation-triangle me-2"></i>
            Sistema de Alertas
          </h2>
          <p className="text-muted">Gestión y seguimiento de alertas del sistema</p>
        </Col>
        <Col xs="auto">
          <Button
            variant="success"
            onClick={handleGenerarAutomaticas}
            className="me-2"
          >
            <i className="bi bi-gear me-2"></i>
            Generar Automáticas
          </Button>
          {alertasSeleccionadas.length > 0 && (
            <Button
              variant="primary"
              onClick={handleResolverMultiples}
            >
              <i className="bi bi-check-all me-2"></i>
              Resolver Seleccionadas ({alertasSeleccionadas.length})
            </Button>
          )}
        </Col>
      </Row>

      {/* Estadísticas */}
      {renderEstadisticas()}

      {/* Filtros */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Tipo</Form.Label>
                <Form.Select
                  value={filtros.tipo}
                  onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
                >
                  <option value="">Todos</option>
                  <option value="stock">Stock</option>
                  <option value="vencimiento">Vencimiento</option>
                  <option value="critica">Crítica</option>
                  <option value="manual">Manual</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Prioridad</Form.Label>
                <Form.Select
                  value={filtros.prioridad}
                  onChange={(e) => setFiltros({ ...filtros, prioridad: e.target.value })}
                >
                  <option value="">Todas</option>
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Estado</Form.Label>
                <Form.Select
                  value={filtros.resuelta}
                  onChange={(e) => setFiltros({ ...filtros, resuelta: e.target.value })}
                >
                  <option value="">Todas</option>
                  <option value="false">Pendientes</option>
                  <option value="true">Resueltas</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Ordenar por</Form.Label>
                <Form.Select
                  value={filtros.sortBy}
                  onChange={(e) => setFiltros({ ...filtros, sortBy: e.target.value })}
                >
                  <option value="fechaCreacion">Fecha Creación</option>
                  <option value="prioridad">Prioridad</option>
                  <option value="tipo">Tipo</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Orden</Form.Label>
                <Form.Select
                  value={filtros.order}
                  onChange={(e) => setFiltros({ ...filtros, order: e.target.value as 'asc' | 'desc' })}
                >
                  <option value="desc">Descendente</option>
                  <option value="asc">Ascendente</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={1} className="d-flex align-items-end">
              <Button
                variant="outline-secondary"
                onClick={() => setFiltros({
                  tipo: '',
                  prioridad: '',
                  resuelta: '',
                  depositoAfectado: '',
                  sortBy: 'fechaCreacion',
                  order: 'desc'
                })}
              >
                <i className="bi bi-arrow-clockwise"></i>
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Tabla de Alertas */}
      <Card>
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">Cargando alertas...</p>
            </div>
          ) : error ? (
            <Alert variant="danger">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
            </Alert>
          ) : alertas.length === 0 ? (
            <Alert variant="info">
              <i className="bi bi-info-circle me-2"></i>
              No hay alertas con los filtros seleccionados
            </Alert>
          ) : (
            <>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <Form.Check
                        type="checkbox"
                        checked={alertasSeleccionadas.length === alertas.filter(a => !a.resuelta).length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAlertasSeleccionadas(alertas.filter(a => !a.resuelta).map(a => a._id));
                          } else {
                            setAlertasSeleccionadas([]);
                          }
                        }}
                      />
                    </th>
                    <th>Tipo</th>
                    <th>Prioridad</th>
                    <th>Estado</th>
                    <th>Mensaje</th>
                    <th>Depósito</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {alertas.map((alerta) => (
                    <tr key={alerta._id}>
                      <td>
                        {!alerta.resuelta && (
                          <Form.Check
                            type="checkbox"
                            checked={alertasSeleccionadas.includes(alerta._id)}
                            onChange={() => toggleSeleccionAlerta(alerta._id)}
                          />
                        )}
                      </td>
                      <td>{getBadgeTipo(alerta.tipo)}</td>
                      <td>{getBadgePrioridad(alerta.prioridad)}</td>
                      <td>{getBadgeEstado(alerta.resuelta)}</td>
                      <td className="text-truncate" style={{ maxWidth: '300px' }}>
                        {alerta.mensaje}
                      </td>
                      <td>
                        {alerta.depositoAfectado && typeof alerta.depositoAfectado === 'object' ?
                          <span className="text-primary">{alerta.depositoAfectado.numeroDeposito}</span> :
                          <span className="text-muted">-</span>
                        }
                      </td>
                      <td>{formatearFecha(alerta.createdAt)}</td>
                      <td>
                        <Button
                          variant="outline-info"
                          size="sm"
                          className="me-2"
                          onClick={() => abrirModalDetalle(alerta)}
                        >
                          <i className="bi bi-eye"></i>
                        </Button>
                        {!alerta.resuelta && (
                          <Button
                            variant="outline-success"
                            size="sm"
                            className="me-2"
                            onClick={() => abrirModalResolver(alerta)}
                          >
                            <i className="bi bi-check-lg"></i>
                          </Button>
                        )}
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleEliminarAlerta(alerta._id)}
                        >
                          <i className="bi bi-trash"></i>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              {/* Paginación */}
              <div className="d-flex justify-content-between align-items-center mt-3">
                <div>
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalAlertas)} de {totalAlertas} alertas
                </div>
                <div>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="me-2"
                  >
                    <i className="bi bi-chevron-left"></i> Anterior
                  </Button>
                  <span className="mx-3">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Siguiente <i className="bi bi-chevron-right"></i>
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card.Body>
      </Card>

      {/* Modal Resolver Alerta */}
      <Modal show={showResolverModal} onHide={() => setShowResolverModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Resolver Alerta</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {alertaSeleccionada && (
            <>
              <p><strong>Mensaje:</strong> {alertaSeleccionada.mensaje}</p>
              <p><strong>Tipo:</strong> {getBadgeTipo(alertaSeleccionada.tipo)}</p>
              <p><strong>Prioridad:</strong> {getBadgePrioridad(alertaSeleccionada.prioridad)}</p>
              <hr />
              <Form.Group>
                <Form.Label>Observaciones (opcional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Añade observaciones sobre la resolución..."
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowResolverModal(false)}>
            Cancelar
          </Button>
          <Button variant="success" onClick={handleResolverAlerta}>
            <i className="bi bi-check-lg me-2"></i>
            Resolver Alerta
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Detalle Alerta */}
      <Modal show={showDetalleModal} onHide={() => setShowDetalleModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Detalle de Alerta</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {alertaSeleccionada && (
            <Row>
              <Col md={6}>
                <p><strong>Tipo:</strong> {getBadgeTipo(alertaSeleccionada.tipo)}</p>
                <p><strong>Prioridad:</strong> {getBadgePrioridad(alertaSeleccionada.prioridad)}</p>
                <p><strong>Estado:</strong> {getBadgeEstado(alertaSeleccionada.resuelta)}</p>
                <p><strong>Mensaje:</strong> {alertaSeleccionada.mensaje}</p>
              </Col>
              <Col md={6}>
                <p><strong>Depósito:</strong> {
                  alertaSeleccionada.depositoAfectado && typeof alertaSeleccionada.depositoAfectado === 'object' ?
                  alertaSeleccionada.depositoAfectado.numeroDeposito : '-'
                }</p>
                <p><strong>Fecha Creación:</strong> {formatearFecha(alertaSeleccionada.createdAt)}</p>
                {alertaSeleccionada.resuelta && alertaSeleccionada.fechaResolucion && (
                  <p><strong>Fecha Resolución:</strong> {formatearFecha(alertaSeleccionada.fechaResolucion)}</p>
                )}
              </Col>
              {alertaSeleccionada.observaciones && (
                <Col md={12}>
                  <hr />
                  <p><strong>Observaciones:</strong></p>
                  <p className="text-muted">{alertaSeleccionada.observaciones}</p>
                </Col>
              )}
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetalleModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AlertasPage;
