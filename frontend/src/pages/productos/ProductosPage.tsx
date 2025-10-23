/**
 * AssetFlow 3.0 - Productos Page
 * CRUD completo de productos con tabla, filtros y formulario modal
 */

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Modal, Badge, Spinner, Alert, InputGroup } from 'react-bootstrap';
import toast from 'react-hot-toast';
import productoService from '../../services/productoService';
import type { Producto, ProductoFormData } from '../../types';

export const ProductosPage = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActivo, setFilterActivo] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState<ProductoFormData>({
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria: '',
    precioUnitario: 0,
    unidadMedida: 'unidades',
    stockEnNuestroAlmacen: 0,
    activo: true,
  });

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      setLoading(true);
      const response = await productoService.getAll({ limit: 1000 });
      setProductos(response.productos);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShowModal = (producto?: Producto) => {
    if (producto) {
      setEditingProducto(producto);
      setFormData({
        codigo: producto.codigo,
        nombre: producto.nombre,
        descripcion: producto.descripcion || '',
        categoria: producto.categoria || '',
        precioUnitario: producto.precioUnitario,
        unidadMedida: producto.unidadMedida || 'unidades',
        stockEnNuestroAlmacen: producto.stockEnNuestroAlmacen || 0,
        activo: producto.activo,
      });
    } else {
      setEditingProducto(null);
      setFormData({
        codigo: '',
        nombre: '',
        descripcion: '',
        categoria: '',
        precioUnitario: 0,
        unidadMedida: 'unidades',
        stockEnNuestroAlmacen: 0,
        activo: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProducto(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProducto) {
        await productoService.update(editingProducto._id, formData);
        toast.success('Producto actualizado correctamente');
      } else {
        await productoService.create(formData);
        toast.success('Producto creado correctamente');
      }
      handleCloseModal();
      cargarProductos();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto?')) return;
    try {
      await productoService.delete(id);
      toast.success('Producto eliminado correctamente');
      cargarProductos();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleToggleActivo = async (id: string, activo: boolean) => {
    try {
      await productoService.toggleActivo(id, !activo);
      toast.success(`Producto ${!activo ? 'activado' : 'desactivado'} correctamente`);
      cargarProductos();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const productosFiltrados = productos.filter((p) => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesActivo = filterActivo === 'all' ||
                         (filterActivo === 'true' && p.activo) ||
                         (filterActivo === 'false' && !p.activo);
    return matchesSearch && matchesActivo;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="fw-bold mb-1">Productos</h2>
              <p className="text-muted mb-0">Gestión del catálogo de productos</p>
            </div>
            <Button variant="primary" onClick={() => handleShowModal()}>
              <i className="bi bi-plus-circle me-2"></i>
              Nuevo Producto
            </Button>
          </div>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={8}>
          <InputGroup>
            <InputGroup.Text><i className="bi bi-search"></i></InputGroup.Text>
            <Form.Control
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={4}>
          <Form.Select value={filterActivo} onChange={(e) => setFilterActivo(e.target.value)}>
            <option value="all">Todos los productos</option>
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
                  <p className="mt-3 text-muted">Cargando productos...</p>
                </div>
              ) : productosFiltrados.length === 0 ? (
                <Alert variant="info" className="m-4">
                  No se encontraron productos. {searchTerm && 'Intenta con otros términos de búsqueda.'}
                </Alert>
              ) : (
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Categoría</th>
                        <th className="text-end">Precio Unit.</th>
                        <th>Unidad</th>
                        <th className="text-end">Stock</th>
                        <th className="text-center">Estado</th>
                        <th className="text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosFiltrados.map((producto) => (
                        <tr key={producto._id}>
                          <td><code>{producto.codigo}</code></td>
                          <td><strong>{producto.nombre}</strong></td>
                          <td>{producto.categoria || '-'}</td>
                          <td className="text-end">{formatCurrency(producto.precioUnitario)}</td>
                          <td>{producto.unidadMedida}</td>
                          <td className="text-end">{producto.stockEnNuestroAlmacen || 0}</td>
                          <td className="text-center">
                            <Badge bg={producto.activo ? 'success' : 'secondary'}>
                              {producto.activo ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </td>
                          <td className="text-center">
                            <div className="d-flex gap-1 justify-content-center">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleShowModal(producto)}
                                title="Editar"
                              >
                                <i className="bi bi-pencil"></i>
                              </Button>
                              <Button
                                variant={producto.activo ? 'outline-warning' : 'outline-success'}
                                size="sm"
                                onClick={() => handleToggleActivo(producto._id, producto.activo)}
                                title={producto.activo ? 'Desactivar' : 'Activar'}
                              >
                                <i className={`bi bi-${producto.activo ? 'eye-slash' : 'eye'}`}></i>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDelete(producto._id)}
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
                Total: {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? 's' : ''}
              </small>
            </Card.Footer>
          </Card>
        </Col>
      </Row>

      {/* Modal Formulario */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingProducto ? 'Editar Producto' : 'Nuevo Producto'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Código *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    required
                    disabled={!!editingProducto}
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
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Descripción</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Categoría</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Precio Unitario (€) *</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.precioUnitario}
                    onChange={(e) => setFormData({ ...formData, precioUnitario: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Unidad de Medida</Form.Label>
                  <Form.Select
                    value={formData.unidadMedida}
                    onChange={(e) => setFormData({ ...formData, unidadMedida: e.target.value })}
                  >
                    <option value="unidades">Unidades</option>
                    <option value="kg">Kilogramos</option>
                    <option value="litros">Litros</option>
                    <option value="metros">Metros</option>
                    <option value="cajas">Cajas</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Stock en Almacén</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={formData.stockEnNuestroAlmacen}
                    onChange={(e) => setFormData({ ...formData, stockEnNuestroAlmacen: parseInt(e.target.value) || 0 })}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Producto activo"
                checked={formData.activo}
                onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {editingProducto ? 'Actualizar' : 'Crear'} Producto
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default ProductosPage;
