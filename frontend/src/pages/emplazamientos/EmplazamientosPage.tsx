/**
 * AssetFlow 3.0 - Emplazamientos Page
 * CRUD completo de emplazamientos con tabla, filtros y modal con mapa
 */

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Modal, Badge, Spinner, Alert, InputGroup } from 'react-bootstrap';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import emplazamientoService from '../../services/emplazamientoService';
import clienteService from '../../services/clienteService';
import type { Emplazamiento, EmplazamientoFormData, Cliente } from '../../types';

// Fix Leaflet default icon issue
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export const EmplazamientosPage = () => {
  const [emplazamientos, setEmplazamientos] = useState<Emplazamiento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmplazamiento, setEditingEmplazamiento] = useState<Emplazamiento | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [filterCliente, setFilterCliente] = useState<string>('all');
  const [geocoding, setGeocoding] = useState(false);

  const [formData, setFormData] = useState<EmplazamientoFormData>({
    codigo: '',
    nombre: '',
    cliente: '',
    direccion: '',
    ciudad: '',
    codigoPostal: '',
    provincia: '',
    pais: 'España',
    coordenadas: {
      lat: 40.4168, // Madrid por defecto
      lng: -3.7038
    },
    capacidadM3: undefined,
    tipoAlmacen: 'general',
    responsable: '',
    telefono: '',
    email: '',
    estado: 'activo',
    observaciones: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [empResponse, cliResponse] = await Promise.all([
        emplazamientoService.getAll({ limit: 1000 }),
        clienteService.getActivos()
      ]);
      setEmplazamientos(empResponse.emplazamientos);
      setClientes(cliResponse);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShowModal = (emplazamiento?: Emplazamiento) => {
    if (emplazamiento) {
      setEditingEmplazamiento(emplazamiento);
      setFormData({
        codigo: emplazamiento.codigo,
        nombre: emplazamiento.nombre,
        cliente: typeof emplazamiento.cliente === 'string' ? emplazamiento.cliente : emplazamiento.cliente._id,
        direccion: emplazamiento.direccion,
        ciudad: emplazamiento.ciudad,
        codigoPostal: emplazamiento.codigoPostal || '',
        provincia: emplazamiento.provincia || '',
        pais: emplazamiento.pais || 'España',
        coordenadas: emplazamiento.coordenadas,
        capacidadM3: emplazamiento.capacidadM3,
        tipoAlmacen: emplazamiento.tipoAlmacen || 'general',
        responsable: emplazamiento.responsable || '',
        telefono: emplazamiento.telefono || '',
        email: emplazamiento.email || '',
        estado: emplazamiento.estado,
        observaciones: emplazamiento.observaciones || ''
      });
    } else {
      setEditingEmplazamiento(null);
      setFormData({
        codigo: '',
        nombre: '',
        cliente: '',
        direccion: '',
        ciudad: '',
        codigoPostal: '',
        provincia: '',
        pais: 'España',
        coordenadas: {
          lat: 40.4168,
          lng: -3.7038
        },
        capacidadM3: undefined,
        tipoAlmacen: 'general',
        responsable: '',
        telefono: '',
        email: '',
        estado: 'activo',
        observaciones: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEmplazamiento(null);
  };

  const handleGeocode = async () => {
    if (!formData.direccion || !formData.ciudad) {
      toast.error('Ingresa dirección y ciudad para obtener coordenadas');
      return;
    }

    try {
      setGeocoding(true);
      const result = await emplazamientoService.geocode(
        formData.direccion,
        formData.ciudad,
        formData.provincia,
        formData.pais
      );

      setFormData({
        ...formData,
        coordenadas: {
          lat: result.lat,
          lng: result.lng
        }
      });

      toast.success('Coordenadas obtenidas correctamente');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setGeocoding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (formData.coordenadas.lat < -90 || formData.coordenadas.lat > 90) {
      toast.error('Latitud debe estar entre -90 y 90');
      return;
    }
    if (formData.coordenadas.lng < -180 || formData.coordenadas.lng > 180) {
      toast.error('Longitud debe estar entre -180 y 180');
      return;
    }

    try {
      if (editingEmplazamiento) {
        await emplazamientoService.update(editingEmplazamiento._id, formData);
        toast.success('Emplazamiento actualizado correctamente');
      } else {
        await emplazamientoService.create(formData);
        toast.success('Emplazamiento creado correctamente');
      }
      handleCloseModal();
      cargarDatos();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este emplazamiento?')) return;
    try {
      await emplazamientoService.delete(id);
      toast.success('Emplazamiento eliminado correctamente');
      cargarDatos();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleToggleEstado = async (id: string, estadoActual: 'activo' | 'inactivo') => {
    try {
      const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
      await emplazamientoService.toggleEstado(id, nuevoEstado);
      toast.success(`Emplazamiento ${nuevoEstado === 'activo' ? 'activado' : 'desactivado'} correctamente`);
      cargarDatos();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const emplazamientosFiltrados = emplazamientos.filter((e) => {
    const matchesSearch = e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         e.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         e.ciudad.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = filterEstado === 'all' || e.estado === filterEstado;
    const matchesCliente = filterCliente === 'all' ||
                          (typeof e.cliente === 'string' ? e.cliente === filterCliente : e.cliente._id === filterCliente);
    return matchesSearch && matchesEstado && matchesCliente;
  });

  const getClienteNombre = (cliente: string | Cliente): string => {
    if (typeof cliente === 'string') {
      const found = clientes.find(c => c._id === cliente);
      return found ? found.nombre : 'N/A';
    }
    return cliente.nombre;
  };

  const markerPosition: LatLngExpression = [formData.coordenadas.lat, formData.coordenadas.lng];

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="fw-bold mb-1">Emplazamientos</h2>
              <p className="text-muted mb-0">Gestión de ubicaciones de depósito</p>
            </div>
            <Button variant="primary" onClick={() => handleShowModal()}>
              <i className="bi bi-plus-circle me-2"></i>
              Nuevo Emplazamiento
            </Button>
          </div>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={5}>
          <InputGroup>
            <InputGroup.Text><i className="bi bi-search"></i></InputGroup.Text>
            <Form.Control
              placeholder="Buscar por nombre, código o ciudad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={3}>
          <Form.Select value={filterCliente} onChange={(e) => setFilterCliente(e.target.value)}>
            <option value="all">Todos los clientes</option>
            {clientes.map(cliente => (
              <option key={cliente._id} value={cliente._id}>{cliente.nombre}</option>
            ))}
          </Form.Select>
        </Col>
        <Col md={2}>
          <Form.Select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
            <option value="all">Todos</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </Form.Select>
        </Col>
        <Col md={2}>
          <Button variant="outline-secondary" className="w-100" onClick={cargarDatos}>
            <i className="bi bi-arrow-clockwise me-1"></i>
            Actualizar
          </Button>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card className="shadow-sm">
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3 text-muted">Cargando emplazamientos...</p>
                </div>
              ) : emplazamientosFiltrados.length === 0 ? (
                <Alert variant="info" className="m-4">
                  No se encontraron emplazamientos. {searchTerm && 'Intenta con otros términos de búsqueda.'}
                </Alert>
              ) : (
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Cliente</th>
                        <th>Ciudad</th>
                        <th>Tipo</th>
                        <th className="text-center">Estado</th>
                        <th className="text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emplazamientosFiltrados.map((emplazamiento) => (
                        <tr key={emplazamiento._id}>
                          <td><code>{emplazamiento.codigo}</code></td>
                          <td><strong>{emplazamiento.nombre}</strong></td>
                          <td>{getClienteNombre(emplazamiento.cliente)}</td>
                          <td>{emplazamiento.ciudad}</td>
                          <td>
                            <Badge bg="secondary">
                              {emplazamiento.tipoAlmacen === 'general' && 'General'}
                              {emplazamiento.tipoAlmacen === 'refrigerado' && 'Refrigerado'}
                              {emplazamiento.tipoAlmacen === 'congelado' && 'Congelado'}
                            </Badge>
                          </td>
                          <td className="text-center">
                            <Badge bg={emplazamiento.estado === 'activo' ? 'success' : 'secondary'}>
                              {emplazamiento.estado === 'activo' ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </td>
                          <td className="text-center">
                            <div className="d-flex gap-1 justify-content-center">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleShowModal(emplazamiento)}
                                title="Editar"
                              >
                                <i className="bi bi-pencil"></i>
                              </Button>
                              <Button
                                variant={emplazamiento.estado === 'activo' ? 'outline-warning' : 'outline-success'}
                                size="sm"
                                onClick={() => handleToggleEstado(emplazamiento._id, emplazamiento.estado)}
                                title={emplazamiento.estado === 'activo' ? 'Desactivar' : 'Activar'}
                              >
                                <i className={`bi bi-${emplazamiento.estado === 'activo' ? 'eye-slash' : 'eye'}`}></i>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDelete(emplazamiento._id)}
                                title="Eliminar"
                              >
                                <i className="bi bi-trash"></i>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
            <Card.Footer className="bg-light">
              <small className="text-muted">
                Total: {emplazamientosFiltrados.length} emplazamiento{emplazamientosFiltrados.length !== 1 ? 's' : ''}
              </small>
            </Card.Footer>
          </Card>
        </Col>
      </Row>

      {/* Modal Formulario */}
      <Modal show={showModal} onHide={handleCloseModal} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>{editingEmplazamiento ? 'Editar Emplazamiento' : 'Nuevo Emplazamiento'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={8}>
                {/* Información Básica */}
                <h6 className="fw-bold mb-3">Información Básica</h6>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Código *</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.codigo}
                        onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                        required
                        disabled={!!editingEmplazamiento}
                        placeholder="EMP-2025-001"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nombre *</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        required
                        placeholder="Almacén Norte Madrid"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Cliente *</Form.Label>
                      <Form.Select
                        value={formData.cliente}
                        onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                        required
                      >
                        <option value="">Selecciona un cliente...</option>
                        {clientes.map(cliente => (
                          <option key={cliente._id} value={cliente._id}>{cliente.nombre}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Tipo de Almacén</Form.Label>
                      <Form.Select
                        value={formData.tipoAlmacen}
                        onChange={(e) => setFormData({ ...formData, tipoAlmacen: e.target.value as any })}
                      >
                        <option value="general">General</option>
                        <option value="refrigerado">Refrigerado</option>
                        <option value="congelado">Congelado</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Ubicación */}
                <h6 className="fw-bold mb-3 mt-4">Ubicación</h6>
                <Form.Group className="mb-3">
                  <Form.Label>Dirección *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    required
                    placeholder="Calle Principal 123"
                  />
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Ciudad *</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.ciudad}
                        onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                        required
                        placeholder="Madrid"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>C.P.</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.codigoPostal}
                        onChange={(e) => setFormData({ ...formData, codigoPostal: e.target.value })}
                        placeholder="28001"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Provincia</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.provincia}
                        onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                        placeholder="Madrid"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>País</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.pais}
                        onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
                        placeholder="España"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Capacidad (m³)</Form.Label>
                      <Form.Control
                        type="number"
                        value={formData.capacidadM3 || ''}
                        onChange={(e) => setFormData({ ...formData, capacidadM3: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="1000"
                        min="0"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {/* Coordenadas */}
                <h6 className="fw-bold mb-3 mt-4">Coordenadas para Mapa</h6>
                <Row>
                  <Col md={5}>
                    <Form.Group className="mb-3">
                      <Form.Label>Latitud *</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.000001"
                        value={formData.coordenadas.lat}
                        onChange={(e) => setFormData({
                          ...formData,
                          coordenadas: { ...formData.coordenadas, lat: parseFloat(e.target.value) || 0 }
                        })}
                        required
                        min="-90"
                        max="90"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={5}>
                    <Form.Group className="mb-3">
                      <Form.Label>Longitud *</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.000001"
                        value={formData.coordenadas.lng}
                        onChange={(e) => setFormData({
                          ...formData,
                          coordenadas: { ...formData.coordenadas, lng: parseFloat(e.target.value) || 0 }
                        })}
                        required
                        min="-180"
                        max="180"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={2}>
                    <Form.Label>&nbsp;</Form.Label>
                    <Button
                      variant="info"
                      className="w-100"
                      onClick={handleGeocode}
                      disabled={geocoding || !formData.direccion || !formData.ciudad}
                      title="Obtener coordenadas de la dirección"
                    >
                      {geocoding ? <Spinner animation="border" size="sm" /> : <i className="bi bi-geo-alt"></i>}
                    </Button>
                  </Col>
                </Row>

                {/* Información Adicional */}
                <h6 className="fw-bold mb-3 mt-4">Información Adicional</h6>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Responsable</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.responsable}
                        onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                        placeholder="Juan Pérez"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Teléfono</Form.Label>
                      <Form.Control
                        type="tel"
                        value={formData.telefono}
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                        placeholder="+34 600 000 000"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="contacto@cliente.com"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Estado</Form.Label>
                      <Form.Select
                        value={formData.estado}
                        onChange={(e) => setFormData({ ...formData, estado: e.target.value as any })}
                      >
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Observaciones</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    placeholder="Información adicional..."
                  />
                </Form.Group>
              </Col>

              {/* Mapa Preview */}
              <Col md={4}>
                <h6 className="fw-bold mb-3">Vista Previa en Mapa</h6>
                <div style={{ height: '600px', border: '1px solid #dee2e6', borderRadius: '4px' }}>
                  <MapContainer
                    center={markerPosition}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    key={`${formData.coordenadas.lat}-${formData.coordenadas.lng}`}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={markerPosition}>
                      <Popup>
                        <strong>{formData.nombre || 'Nuevo Emplazamiento'}</strong><br />
                        {formData.direccion && <>{formData.direccion}<br /></>}
                        {formData.ciudad && <>{formData.ciudad}<br /></>}
                        Lat: {formData.coordenadas.lat.toFixed(6)}<br />
                        Lng: {formData.coordenadas.lng.toFixed(6)}
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>
                <div className="mt-2 text-center">
                  <small className="text-muted">
                    Haz click en el botón <i className="bi bi-geo-alt"></i> para obtener coordenadas automáticamente
                  </small>
                </div>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {editingEmplazamiento ? 'Actualizar' : 'Crear'} Emplazamiento
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default EmplazamientosPage;
