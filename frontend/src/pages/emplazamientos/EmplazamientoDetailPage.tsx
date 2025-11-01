/**
 * AssetFlow 3.0 - Emplazamiento Detail Page
 * Página de detalle/informe visual de un emplazamiento específico
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Spinner, Alert, Table, Badge } from 'react-bootstrap';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import toast from 'react-hot-toast';
import emplazamientoService from '../../services/emplazamientoService';
import depositoService from '../../services/depositoService';
import type { Emplazamiento, Deposito, EmplazamientoEstadisticas } from '../../types';
import 'leaflet/dist/leaflet.css';

// Icon para el marcador del emplazamiento
const defaultIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export const EmplazamientoDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [emplazamiento, setEmplazamiento] = useState<Emplazamiento | null>(null);
  const [estadisticas, setEstadisticas] = useState<EmplazamientoEstadisticas | null>(null);
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      cargarDatos();
    }
  }, [id]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar datos en paralelo
      const [emplazamientoData, estadisticasData, depositosData] = await Promise.all([
        emplazamientoService.getById(id!),
        emplazamientoService.getEstadisticas(id!),
        depositoService.getByEmplazamiento(id!)
      ]);

      setEmplazamiento(emplazamientoData);
      setEstadisticas(estadisticasData);
      setDepositos(depositosData);
    } catch (error: any) {
      console.error('Error al cargar datos del emplazamiento:', error);
      setError(error.message || 'Error al cargar los datos');
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVolver = () => {
    navigate('/dashboard');
  };

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, string> = {
      activo: 'success',
      proximo_vencimiento: 'warning',
      vencido: 'danger',
      retirado: 'secondary',
      facturado: 'info'
    };
    return variants[estado] || 'secondary';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Cargando datos del emplazamiento...</p>
        </div>
      </Container>
    );
  }

  if (error || !emplazamiento) {
    return (
      <Container fluid className="py-4">
        <Alert variant="danger">
          <Alert.Heading>Error</Alert.Heading>
          <p>{error || 'No se pudo cargar el emplazamiento'}</p>
          <hr />
          <div className="d-flex justify-content-end">
            <Button variant="outline-danger" onClick={handleVolver}>
              Volver al Dashboard
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  const cliente = typeof emplazamiento.cliente === 'object' ? emplazamiento.cliente : null;
  const subcliente = emplazamiento.subcliente && typeof emplazamiento.subcliente === 'object'
    ? emplazamiento.subcliente
    : null;

  return (
    <Container fluid className="py-4">
      {/* Header con botón de volver */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <Button
                variant="outline-secondary"
                onClick={handleVolver}
                className="mb-2"
              >
                <i className="bi bi-arrow-left me-2"></i>
                Volver al Dashboard
              </Button>
              <h2 className="fw-bold mb-1">
                <i className="bi bi-geo-alt-fill text-primary me-2"></i>
                {emplazamiento.nombre}
              </h2>
              <p className="text-muted mb-0">
                Código: <code>{emplazamiento.codigo}</code>
                {' | '}
                Estado: <Badge bg={emplazamiento.estado === 'activo' ? 'success' : 'secondary'}>
                  {emplazamiento.estado.toUpperCase()}
                </Badge>
              </p>
            </div>
          </div>
        </Col>
      </Row>

      {/* Información General */}
      <Row className="mb-4">
        <Col md={6}>
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-primary text-white">
              <i className="bi bi-info-circle me-2"></i>
              Información General
            </Card.Header>
            <Card.Body>
              <Table borderless size="sm">
                <tbody>
                  <tr>
                    <td className="text-muted"><strong>Cliente:</strong></td>
                    <td>{cliente?.nombre || 'N/A'}</td>
                  </tr>
                  {subcliente && (
                    <tr>
                      <td className="text-muted"><strong>Subcliente:</strong></td>
                      <td>{subcliente.nombre}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="text-muted"><strong>Dirección:</strong></td>
                    <td>{emplazamiento.direccion}</td>
                  </tr>
                  <tr>
                    <td className="text-muted"><strong>Ciudad:</strong></td>
                    <td>{emplazamiento.ciudad}</td>
                  </tr>
                  {emplazamiento.provincia && (
                    <tr>
                      <td className="text-muted"><strong>Provincia:</strong></td>
                      <td>{emplazamiento.provincia}</td>
                    </tr>
                  )}
                  {emplazamiento.codigoPostal && (
                    <tr>
                      <td className="text-muted"><strong>C.P.:</strong></td>
                      <td>{emplazamiento.codigoPostal}</td>
                    </tr>
                  )}
                  {emplazamiento.tipoAlmacen && (
                    <tr>
                      <td className="text-muted"><strong>Tipo:</strong></td>
                      <td className="text-capitalize">{emplazamiento.tipoAlmacen}</td>
                    </tr>
                  )}
                  {emplazamiento.capacidadM3 && (
                    <tr>
                      <td className="text-muted"><strong>Capacidad:</strong></td>
                      <td>{emplazamiento.capacidadM3} m³</td>
                    </tr>
                  )}
                  {emplazamiento.responsable && (
                    <tr>
                      <td className="text-muted"><strong>Responsable:</strong></td>
                      <td>{emplazamiento.responsable}</td>
                    </tr>
                  )}
                  {emplazamiento.telefono && (
                    <tr>
                      <td className="text-muted"><strong>Teléfono:</strong></td>
                      <td>{emplazamiento.telefono}</td>
                    </tr>
                  )}
                  {emplazamiento.email && (
                    <tr>
                      <td className="text-muted"><strong>Email:</strong></td>
                      <td>{emplazamiento.email}</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        {/* Estadísticas */}
        <Col md={6}>
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-success text-white">
              <i className="bi bi-bar-chart me-2"></i>
              Estadísticas
            </Card.Header>
            <Card.Body>
              {estadisticas ? (
                <Row>
                  <Col xs={6} className="mb-3">
                    <div className="text-center p-3 bg-light rounded">
                      <h3 className="mb-1 text-primary">{estadisticas.totalDepositos}</h3>
                      <small className="text-muted">Total Depósitos</small>
                    </div>
                  </Col>
                  <Col xs={6} className="mb-3">
                    <div className="text-center p-3 bg-light rounded">
                      <h3 className="mb-1 text-success">{estadisticas.depositosActivos}</h3>
                      <small className="text-muted">Activos</small>
                    </div>
                  </Col>
                  <Col xs={6} className="mb-3">
                    <div className="text-center p-3 bg-light rounded">
                      <h3 className="mb-1 text-warning">{estadisticas.depositosProximosVencer}</h3>
                      <small className="text-muted">Próximos Vencer</small>
                    </div>
                  </Col>
                  <Col xs={6} className="mb-3">
                    <div className="text-center p-3 bg-light rounded">
                      <h3 className="mb-1 text-danger">{estadisticas.depositosVencidos}</h3>
                      <small className="text-muted">Vencidos</small>
                    </div>
                  </Col>
                  <Col xs={12}>
                    <div className="text-center p-3 bg-primary text-white rounded">
                      <h4 className="mb-1">{formatCurrency(estadisticas.valorTotalDepositado)}</h4>
                      <small>Valor Total Depositado</small>
                    </div>
                  </Col>
                </Row>
              ) : (
                <p className="text-muted">No hay estadísticas disponibles</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Mapa del Emplazamiento */}
      <Row className="mb-4">
        <Col>
          <Card className="shadow-sm">
            <Card.Header className="bg-info text-white">
              <i className="bi bi-map me-2"></i>
              Ubicación en Mapa
            </Card.Header>
            <Card.Body style={{ height: '400px', padding: 0 }}>
              <MapContainer
                center={[emplazamiento.coordenadas.lat, emplazamiento.coordenadas.lng]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker
                  position={[emplazamiento.coordenadas.lat, emplazamiento.coordenadas.lng]}
                  icon={defaultIcon}
                >
                  <Popup>
                    <div>
                      <strong>{emplazamiento.nombre}</strong><br />
                      {emplazamiento.direccion}<br />
                      {emplazamiento.ciudad}
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Lista de Depósitos */}
      <Row className="mb-4">
        <Col>
          <Card className="shadow-sm">
            <Card.Header className="bg-dark text-white">
              <i className="bi bi-box-seam me-2"></i>
              Depósitos en este Emplazamiento ({depositos.length})
            </Card.Header>
            <Card.Body className="p-0">
              {depositos.length === 0 ? (
                <Alert variant="info" className="m-4">
                  No hay depósitos registrados en este emplazamiento.
                </Alert>
              ) : (
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Nº Depósito</th>
                        <th>Producto</th>
                        <th>Cliente</th>
                        <th>Cantidad</th>
                        <th>Valor Unitario</th>
                        <th>Valor Total</th>
                        <th>Fecha Depósito</th>
                        <th>Fecha Vencimiento</th>
                        <th>Días Restantes</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {depositos.map((deposito) => {
                        const producto = typeof deposito.producto === 'object' ? deposito.producto : null;
                        const depositoCliente = typeof deposito.cliente === 'object' ? deposito.cliente : null;
                        const depositoSubcliente = deposito.subcliente && typeof deposito.subcliente === 'object'
                          ? deposito.subcliente
                          : null;

                        return (
                          <tr key={deposito._id}>
                            <td><code>{deposito.numeroDeposito}</code></td>
                            <td>
                              {producto ? (
                                <>
                                  <strong>{producto.nombre}</strong><br />
                                  <small className="text-muted">{producto.codigo}</small>
                                </>
                              ) : 'N/A'}
                            </td>
                            <td>
                              {depositoCliente ? depositoCliente.nombre : 'N/A'}
                              {depositoSubcliente && (
                                <>
                                  <br />
                                  <small className="text-muted">({depositoSubcliente.nombre})</small>
                                </>
                              )}
                            </td>
                            <td>{deposito.cantidad}</td>
                            <td>{formatCurrency(deposito.valorUnitario)}</td>
                            <td><strong>{formatCurrency(deposito.valorTotal)}</strong></td>
                            <td>{formatDate(deposito.fechaDeposito)}</td>
                            <td>
                              {deposito.fechaVencimiento
                                ? formatDate(deposito.fechaVencimiento)
                                : <span className="text-muted">Sin vencimiento</span>
                              }
                            </td>
                            <td>
                              {deposito.diasHastaVencimiento !== undefined && deposito.diasHastaVencimiento !== null ? (
                                <span className={
                                  deposito.diasHastaVencimiento < 0
                                    ? 'text-danger'
                                    : deposito.diasHastaVencimiento <= 7
                                      ? 'text-warning'
                                      : 'text-success'
                                }>
                                  {deposito.diasHastaVencimiento} días
                                </span>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td>
                              <Badge bg={getEstadoBadge(deposito.estado)}>
                                {deposito.estado.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
            {depositos.length > 0 && (
              <Card.Footer className="bg-light">
                <Row>
                  <Col md={6}>
                    <small className="text-muted">
                      Total de depósitos: <strong>{depositos.length}</strong>
                    </small>
                  </Col>
                  <Col md={6} className="text-end">
                    <small className="text-muted">
                      Valor total: <strong>{formatCurrency(depositos.reduce((sum, d) => sum + d.valorTotal, 0))}</strong>
                    </small>
                  </Col>
                </Row>
              </Card.Footer>
            )}
          </Card>
        </Col>
      </Row>

      {/* Observaciones */}
      {emplazamiento.observaciones && (
        <Row className="mb-4">
          <Col>
            <Card className="shadow-sm">
              <Card.Header>
                <i className="bi bi-card-text me-2"></i>
                Observaciones
              </Card.Header>
              <Card.Body>
                <p className="mb-0">{emplazamiento.observaciones}</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Footer con botón de volver */}
      <Row>
        <Col className="text-center">
          <Button
            variant="primary"
            onClick={handleVolver}
            size="lg"
          >
            <i className="bi bi-arrow-left me-2"></i>
            Volver al Dashboard
          </Button>
        </Col>
      </Row>
    </Container>
  );
};

export default EmplazamientoDetailPage;
