/**
 * AssetFlow 3.0 - Clientes Page
 * CRUD completo de clientes con tabla, filtros y formulario modal
 */

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Modal, Badge, Spinner, Alert, InputGroup } from 'react-bootstrap';
import toast from 'react-hot-toast';
import clienteService from '../../services/clienteService';
import type { Cliente, ClienteFormData } from '../../types';

export const ClientesPage = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActivo, setFilterActivo] = useState<string>('all');

  const [formData, setFormData] = useState<ClienteFormData>({
    codigo: '',
    nombre: '',
    cif: '',
    direccionFiscal: '',
    ciudad: '',
    codigoPostal: '',
    provincia: '',
    pais: 'España',
    telefono: '',
    email: '',
    contacto: '',
    activo: true,
    esSubcliente: false,
    clientePrincipal: '',
  });

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    try {
      setLoading(true);
      const response = await clienteService.getAll({ limit: 1000 });
      setClientes(response.clientes);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShowModal = (cliente?: Cliente) => {
    if (cliente) {
      setEditingCliente(cliente);
      setFormData({
        codigo: cliente.codigo,
        nombre: cliente.nombre,
        cif: cliente.cif || '',
        direccionFiscal: cliente.direccionFiscal || '',
        ciudad: cliente.ciudad || '',
        codigoPostal: cliente.codigoPostal || '',
        provincia: cliente.provincia || '',
        pais: cliente.pais || 'España',
        telefono: cliente.telefono || '',
        email: cliente.email || '',
        contacto: cliente.contacto || '',
        activo: cliente.activo,
        esSubcliente: cliente.esSubcliente || false,
        clientePrincipal: typeof cliente.clientePrincipal === 'string' ? cliente.clientePrincipal : cliente.clientePrincipal?._id || '',
      });
    } else {
      setEditingCliente(null);
      setFormData({
        codigo: '',
        nombre: '',
        cif: '',
        direccionFiscal: '',
        ciudad: '',
        codigoPostal: '',
        provincia: '',
        pais: 'España',
        telefono: '',
        email: '',
        contacto: '',
        activo: true,
        esSubcliente: false,
        clientePrincipal: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCliente(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Excluir el código del envío (se genera automáticamente en el backend)
      const { codigo, ...dataToSend } = formData;

      if (editingCliente) {
        await clienteService.update(editingCliente._id, dataToSend);
        toast.success('Cliente actualizado correctamente');
      } else {
        await clienteService.create(dataToSend);
        toast.success('Cliente creado correctamente');
      }
      handleCloseModal();
      cargarClientes();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este cliente?')) return;
    try {
      await clienteService.delete(id);
      toast.success('Cliente eliminado correctamente');
      cargarClientes();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleToggleActivo = async (id: string, activo: boolean) => {
    try {
      await clienteService.toggleActivo(id, !activo);
      toast.success(`Cliente ${!activo ? 'activado' : 'desactivado'} correctamente`);
      cargarClientes();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const clientesFiltrados = clientes.filter((c) => {
    const matchesSearch = c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (c.cif && c.cif.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesActivo = filterActivo === 'all' ||
                         (filterActivo === 'true' && c.activo) ||
                         (filterActivo === 'false' && !c.activo);
    return matchesSearch && matchesActivo;
  });

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="fw-bold mb-1">Clientes</h2>
              <p className="text-muted mb-0">Gestión de clientes</p>
            </div>
            <Button variant="primary" onClick={() => handleShowModal()}>
              <i className="bi bi-plus-circle me-2"></i>
              Nuevo Cliente
            </Button>
          </div>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={8}>
          <InputGroup>
            <InputGroup.Text><i className="bi bi-search"></i></InputGroup.Text>
            <Form.Control
              placeholder="Buscar por nombre, código o CIF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={4}>
          <Form.Select value={filterActivo} onChange={(e) => setFilterActivo(e.target.value)}>
            <option value="all">Todos los clientes</option>
            <option value="true">Solo activos</option>
            <option value="false">Solo inactivos</option>
          </Form.Select>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card className="shadow-sm">
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3 text-muted">Cargando clientes...</p>
                </div>
              ) : clientesFiltrados.length === 0 ? (
                <Alert variant="info" className="m-4">
                  No se encontraron clientes. {searchTerm && 'Intenta con otros términos de búsqueda.'}
                </Alert>
              ) : (
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>CIF</th>
                        <th>Ciudad</th>
                        <th>Teléfono</th>
                        <th>Email</th>
                        <th className="text-center">Estado</th>
                        <th className="text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientesFiltrados.map((cliente) => (
                        <tr key={cliente._id}>
                          <td><code>{cliente.codigo}</code></td>
                          <td><strong>{cliente.nombre}</strong></td>
                          <td>{cliente.cif || '-'}</td>
                          <td>{cliente.ciudad || '-'}</td>
                          <td>{cliente.telefono || '-'}</td>
                          <td>{cliente.email || '-'}</td>
                          <td className="text-center">
                            <Badge bg={cliente.activo ? 'success' : 'secondary'}>
                              {cliente.activo ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </td>
                          <td className="text-center">
                            <div className="d-flex gap-1 justify-content-center">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleShowModal(cliente)}
                                title="Editar"
                              >
                                <i className="bi bi-pencil"></i>
                              </Button>
                              <Button
                                variant={cliente.activo ? 'outline-warning' : 'outline-success'}
                                size="sm"
                                onClick={() => handleToggleActivo(cliente._id, cliente.activo)}
                                title={cliente.activo ? 'Desactivar' : 'Activar'}
                              >
                                <i className={`bi bi-${cliente.activo ? 'eye-slash' : 'eye'}`}></i>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDelete(cliente._id)}
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
                Total: {clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? 's' : ''}
              </small>
            </Card.Footer>
          </Card>
        </Col>
      </Row>

      {/* Modal Formulario */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Código {editingCliente && <span className="text-muted">(Generado automáticamente)</span>}
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={editingCliente ? formData.codigo : (formData.esSubcliente ? 'SUB-CLI-XXXXX (Auto)' : 'CLI-XXXXX (Auto)')}
                    readOnly
                    disabled
                    className="bg-light"
                  />
                  {!editingCliente && (
                    <Form.Text className="text-muted">
                      El código se generará automáticamente al crear el cliente
                    </Form.Text>
                  )}
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
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>CIF/NIF</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.cif}
                    onChange={(e) => setFormData({ ...formData, cif: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Contacto</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.contacto}
                    onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Dirección Fiscal</Form.Label>
              <Form.Control
                type="text"
                value={formData.direccionFiscal}
                onChange={(e) => setFormData({ ...formData, direccionFiscal: e.target.value })}
              />
            </Form.Group>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Ciudad</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.ciudad}
                    onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Provincia</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.provincia}
                    onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>C.P.</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.codigoPostal}
                    onChange={(e) => setFormData({ ...formData, codigoPostal: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>País</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.pais}
                    onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Teléfono</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Cliente activo"
                checked={formData.activo}
                onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
              />
            </Form.Group>

            <hr />

            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    label="Es Subcliente"
                    checked={formData.esSubcliente}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        esSubcliente: e.target.checked,
                        clientePrincipal: e.target.checked ? formData.clientePrincipal : ''
                      });
                    }}
                  />
                  <Form.Text className="text-muted">
                    Marca esta opción si este cliente es un subcliente de otro cliente principal
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            {formData.esSubcliente && (
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>Cliente Principal *</Form.Label>
                    <Form.Select
                      value={formData.clientePrincipal}
                      onChange={(e) => setFormData({ ...formData, clientePrincipal: e.target.value })}
                      required={formData.esSubcliente}
                    >
                      <option value="">Selecciona un cliente principal...</option>
                      {clientes
                        .filter(c => !c.esSubcliente && c._id !== editingCliente?._id)
                        .map(c => (
                          <option key={c._id} value={c._id}>
                            {c.codigo} - {c.nombre}
                          </option>
                        ))
                      }
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {editingCliente ? 'Actualizar' : 'Crear'} Cliente
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default ClientesPage;
