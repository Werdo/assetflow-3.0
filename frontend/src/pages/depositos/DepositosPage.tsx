/**
 * AssetFlow 3.0 - Página de Gestión de Depósitos
 * CRUD completo con formulario multi-paso y acciones especiales
 */

import { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Form,
  Modal,
  Badge,
  InputGroup,
  Alert,
  ProgressBar,
  Spinner
} from 'react-bootstrap';
import toast from 'react-hot-toast';
import depositoService from '../../services/depositoService';
import clienteService from '../../services/clienteService';
import emplazamientoService from '../../services/emplazamientoService';
import productoService from '../../services/productoService';
import type {
  Deposito,
  Cliente,
  Emplazamiento,
  Producto,
  EstadoDeposito
} from '../../types';

// Interfaz para productos en el formulario
interface ProductoFormItem {
  producto: string; // ID del producto
  cantidad: number;
  valorUnitario: number;
}

const DepositosPage = () => {
  // Estados principales
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedDeposito, setSelectedDeposito] = useState<Deposito | null>(null);

  // Estados para el formulario multi-paso
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    producto: '',
    emplazamiento: '',
    cantidad: 0,
    valorUnitario: 0,
    fechaDeposito: new Date().toISOString().split('T')[0],
    fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 días por defecto
    observaciones: ''
  });

  // Estado para productos dinámicos
  const [productosFormulario, setProductosFormulario] = useState<ProductoFormItem[]>([
    { producto: '', cantidad: 1, valorUnitario: 0 }
  ]);

  // Estados para selects
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [emplazamientos, setEmplazamientos] = useState<Emplazamiento[]>([]);
  const [emplazamientosFiltrados, setEmplazamientosFiltrados] = useState<Emplazamiento[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');

  // Estados para filtros
  const [filtros, setFiltros] = useState({
    search: '',
    cliente: '',
    emplazamiento: '',
    estado: '' as EstadoDeposito | '',
    fechaDesde: '',
    fechaHasta: ''
  });

  // Estados para acciones especiales
  const [showExtenderPlazo, setShowExtenderPlazo] = useState(false);
  const [showMarcarFacturado, setShowMarcarFacturado] = useState(false);
  const [showMarcarDevuelto, setShowMarcarDevuelto] = useState(false);
  const [extenderPlazoData, setExtenderPlazoData] = useState({
    nuevaFechaVencimiento: '',
    observaciones: ''
  });
  const [marcarFacturadoData, setMarcarFacturadoData] = useState({
    referenciaFactura: '',
    observaciones: ''
  });
  const [marcarDevueltoData, setMarcarDevueltoData] = useState({
    referenciaAlbaran: '',
    observaciones: ''
  });

  // Cargar datos iniciales
  useEffect(() => {
    loadDepositos();
    loadClientes();
    loadEmplazamientos();
    loadProductos();
  }, []);

  // Cargar depósitos
  const loadDepositos = async () => {
    try {
      setLoading(true);
      const response = await depositoService.getAll({
        ...filtros,
        estado: filtros.estado || undefined
      });
      setDepositos(response.depositos);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Cargar clientes activos
  const loadClientes = async () => {
    try {
      const data = await clienteService.getActivos();
      setClientes(data);
    } catch (error: any) {
      toast.error('Error al cargar clientes');
    }
  };

  // Cargar emplazamientos activos
  const loadEmplazamientos = async () => {
    try {
      const data = await emplazamientoService.getActivos();
      setEmplazamientos(data);
    } catch (error: any) {
      toast.error('Error al cargar emplazamientos');
    }
  };

  // Cargar productos activos
  const loadProductos = async () => {
    try {
      const data = await productoService.getActivos();
      setProductos(data);
    } catch (error: any) {
      toast.error('Error al cargar productos');
    }
  };

  // Filtrar emplazamientos cuando cambia el cliente
  useEffect(() => {
    if (clienteSeleccionado) {
      const filtered = emplazamientos.filter(emp => {
        if (typeof emp.cliente === 'string') {
          return emp.cliente === clienteSeleccionado;
        }
        return emp.cliente._id === clienteSeleccionado;
      });
      setEmplazamientosFiltrados(filtered);
    } else {
      setEmplazamientosFiltrados([]);
    }
  }, [clienteSeleccionado, emplazamientos]);

  // Aplicar filtros
  useEffect(() => {
    loadDepositos();
  }, [filtros]);

  // Abrir modal crear
  const handleOpenCreate = () => {
    setModalMode('create');
    setCurrentStep(1);
    setFormData({
      producto: '',
      emplazamiento: '',
      cantidad: 0,
      valorUnitario: 0,
      fechaDeposito: new Date().toISOString().split('T')[0],
      fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 días por defecto
      observaciones: ''
    });
    setProductosFormulario([{ producto: '', cantidad: 1, valorUnitario: 0 }]);
    setClienteSeleccionado('');
    setShowModal(true);
  };

  // Abrir modal editar
  const handleOpenEdit = (deposito: Deposito) => {
    setModalMode('edit');
    setSelectedDeposito(deposito);
    // Rellenar formData con datos del depósito
    setFormData({
      producto: typeof deposito.producto === 'string' ? deposito.producto : deposito.producto._id,
      emplazamiento: typeof deposito.emplazamiento === 'string' ? deposito.emplazamiento : deposito.emplazamiento._id,
      cantidad: deposito.cantidad,
      valorUnitario: deposito.valorUnitario,
      fechaDeposito: deposito.fechaDeposito.split('T')[0],
      fechaVencimiento: deposito.fechaVencimiento ? deposito.fechaVencimiento.split('T')[0] : '',
      observaciones: deposito.observaciones || ''
    });
    setShowModal(true);
  };

  // Abrir modal ver detalle
  const handleOpenView = (deposito: Deposito) => {
    setModalMode('view');
    setSelectedDeposito(deposito);
    setShowModal(true);
  };

  // Cerrar modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedDeposito(null);
    setCurrentStep(1);
  };

  // Navegación entre pasos
  const handleNextStep = () => {
    // Validar paso 1
    if (currentStep === 1) {
      if (!clienteSeleccionado) {
        toast.error('Selecciona un cliente');
        return;
      }
      if (!formData.emplazamiento) {
        toast.error('Selecciona un emplazamiento');
        return;
      }
      if (!formData.fechaDeposito) {
        toast.error('Ingresa fecha de inicio');
        return;
      }
      if (!formData.fechaVencimiento) {
        toast.error('Ingresa fecha límite');
        return;
      }
      if (new Date(formData.fechaVencimiento) <= new Date(formData.fechaDeposito)) {
        toast.error('La fecha límite debe ser posterior a la fecha de inicio');
        return;
      }
    }

    // Validar paso 2
    if (currentStep === 2) {
      const hayProductosVacios = productosFormulario.some(p => !p.producto || p.cantidad <= 0);
      if (hayProductosVacios) {
        toast.error('Completa todos los productos o elimina filas vacías');
        return;
      }
      if (productosFormulario.length === 0) {
        toast.error('Agrega al menos un producto');
        return;
      }
    }

    setCurrentStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  // Agregar producto al formulario
  const handleAddProducto = () => {
    setProductosFormulario([...productosFormulario, { producto: '', cantidad: 1, valorUnitario: 0 }]);
  };

  // Eliminar producto del formulario
  const handleRemoveProducto = (index: number) => {
    if (productosFormulario.length > 1) {
      const updated = productosFormulario.filter((_, i) => i !== index);
      setProductosFormulario(updated);
    }
  };

  // Actualizar producto en formulario
  const handleUpdateProducto = (index: number, field: keyof ProductoFormItem, value: any) => {
    const updated = [...productosFormulario];
    updated[index] = { ...updated[index], [field]: value };

    // Si selecciona producto, autocompletar precio unitario
    if (field === 'producto' && value) {
      const producto = productos.find(p => p._id === value);
      if (producto) {
        updated[index].valorUnitario = producto.precioUnitario;
      }
    }

    setProductosFormulario(updated);
  };

  // Calcular valor total del depósito
  const calcularValorTotal = (): number => {
    return productosFormulario.reduce((total, item) => {
      return total + (item.cantidad * item.valorUnitario);
    }, 0);
  };

  // Calcular días de depósito
  const calcularDiasDeposito = (): number => {
    if (!formData.fechaDeposito || !formData.fechaVencimiento) return 0;
    const inicio = new Date(formData.fechaDeposito);
    const fin = new Date(formData.fechaVencimiento);
    const diff = fin.getTime() - inicio.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Guardar depósito
  const handleSave = async () => {
    try {
      setLoading(true);

      if (modalMode === 'create') {
        // Usar el primer producto de productosFormulario
        const primerProducto = productosFormulario[0];
        if (!primerProducto || !primerProducto.producto) {
          toast.error('Debe seleccionar al menos un producto');
          setLoading(false);
          return;
        }

        // Validar que se haya seleccionado un cliente
        if (!clienteSeleccionado) {
          toast.error('Debe seleccionar un cliente');
          setLoading(false);
          return;
        }

        await depositoService.create({
          producto: primerProducto.producto,
          cliente: clienteSeleccionado,
          emplazamiento: formData.emplazamiento,
          cantidad: primerProducto.cantidad,
          valorUnitario: primerProducto.valorUnitario,
          fechaDeposito: formData.fechaDeposito,
          fechaVencimiento: formData.fechaVencimiento,
          observaciones: formData.observaciones
        });
        toast.success('Depósito creado exitosamente');
      } else if (modalMode === 'edit' && selectedDeposito) {
        await depositoService.update(selectedDeposito._id, {
          producto: formData.producto,
          emplazamiento: formData.emplazamiento,
          cantidad: formData.cantidad,
          valorUnitario: formData.valorUnitario,
          fechaDeposito: formData.fechaDeposito,
          fechaVencimiento: formData.fechaVencimiento,
          observaciones: formData.observaciones
        });
        toast.success('Depósito actualizado exitosamente');
      }

      handleCloseModal();
      loadDepositos();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Eliminar depósito
  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este depósito? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setLoading(true);
      await depositoService.delete(id);
      toast.success('Depósito eliminado');
      loadDepositos();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Extender plazo
  const handleExtenderPlazo = async () => {
    if (!selectedDeposito) return;

    if (!extenderPlazoData.nuevaFechaVencimiento) {
      toast.error('Ingresa nueva fecha límite');
      return;
    }

    if (!extenderPlazoData.observaciones) {
      toast.error('Ingresa justificación para extender el plazo');
      return;
    }

    try {
      setLoading(true);
      await depositoService.extenderPlazo(selectedDeposito._id, extenderPlazoData);
      toast.success('Plazo extendido exitosamente');
      setShowExtenderPlazo(false);
      setExtenderPlazoData({ nuevaFechaVencimiento: '', observaciones: '' });
      loadDepositos();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Marcar como facturado
  const handleMarcarFacturado = async () => {
    if (!selectedDeposito) return;

    if (!marcarFacturadoData.referenciaFactura) {
      toast.error('Ingresa referencia de factura');
      return;
    }

    try {
      setLoading(true);
      await depositoService.marcarFacturado(selectedDeposito._id, marcarFacturadoData);
      toast.success('Depósito marcado como facturado');
      setShowMarcarFacturado(false);
      setMarcarFacturadoData({ referenciaFactura: '', observaciones: '' });
      loadDepositos();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Marcar como devuelto
  const handleMarcarDevuelto = async () => {
    if (!selectedDeposito) return;

    if (!marcarDevueltoData.referenciaAlbaran) {
      toast.error('Ingresa referencia de albarán');
      return;
    }

    try {
      setLoading(true);
      await depositoService.marcarDevuelto(selectedDeposito._id, marcarDevueltoData);
      toast.success('Depósito marcado como devuelto');
      setShowMarcarDevuelto(false);
      setMarcarDevueltoData({ referenciaAlbaran: '', observaciones: '' });
      loadDepositos();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Obtener badge de estado
  const getEstadoBadge = (estado: EstadoDeposito) => {
    const badges = {
      activo: <Badge bg="success">Activo</Badge>,
      proximo_vencimiento: <Badge bg="warning">Próximo Vencimiento</Badge>,
      vencido: <Badge bg="danger">Vencido</Badge>,
      retirado: <Badge bg="secondary">Retirado</Badge>,
      facturado: <Badge bg="info">Facturado</Badge>
    };
    return badges[estado] || <Badge bg="secondary">{estado}</Badge>;
  };

  // Obtener color de días restantes
  const getDiasRestantesColor = (dias: number | undefined): string => {
    if (!dias) return 'text-muted';
    if (dias < 0) return 'text-danger fw-bold';
    if (dias <= 3) return 'text-danger fw-bold';
    if (dias <= 7) return 'text-warning';
    if (dias <= 30) return 'text-info';
    return 'text-success';
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2 className="fw-bold mb-0">
            <i className="bi bi-archive me-2"></i>
            Gestión de Depósitos
          </h2>
          <p className="text-muted">Control completo de depósitos con valoración automática</p>
        </Col>
        <Col xs="auto">
          <Button variant="primary" onClick={handleOpenCreate}>
            <i className="bi bi-plus-circle me-2"></i>
            Nuevo Depósito
          </Button>
        </Col>
      </Row>

      {/* Filtros */}
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Row className="g-3">
            <Col md={3}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Buscar por Número</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="DEP-2025-..."
                  value={filtros.search}
                  onChange={(e) => setFiltros({ ...filtros, search: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Cliente</Form.Label>
                <Form.Select
                  value={filtros.cliente}
                  onChange={(e) => setFiltros({ ...filtros, cliente: e.target.value })}
                >
                  <option value="">Todos</option>
                  {clientes.map(cliente => (
                    <option key={cliente._id} value={cliente._id}>{cliente.nombre}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Emplazamiento</Form.Label>
                <Form.Select
                  value={filtros.emplazamiento}
                  onChange={(e) => setFiltros({ ...filtros, emplazamiento: e.target.value })}
                >
                  <option value="">Todos</option>
                  {emplazamientos.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.nombre}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Estado</Form.Label>
                <Form.Select
                  value={filtros.estado}
                  onChange={(e) => setFiltros({ ...filtros, estado: e.target.value as EstadoDeposito | '' })}
                >
                  <option value="">Todos</option>
                  <option value="activo">Activo</option>
                  <option value="proximo_vencimiento">Próximo Vencimiento</option>
                  <option value="vencido">Vencido</option>
                  <option value="retirado">Retirado</option>
                  <option value="facturado">Facturado</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-semibold">Rango de Fechas</Form.Label>
              <InputGroup>
                <Form.Control
                  type="date"
                  value={filtros.fechaDesde}
                  onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value })}
                />
                <Form.Control
                  type="date"
                  value={filtros.fechaHasta}
                  onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value })}
                />
              </InputGroup>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Tabla de Depósitos */}
      <Card className="shadow-sm">
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Cargando depósitos...</p>
            </div>
          ) : depositos.length === 0 ? (
            <Alert variant="info" className="mb-0">
              <i className="bi bi-info-circle me-2"></i>
              No se encontraron depósitos con los filtros aplicados.
            </Alert>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Número</th>
                    <th>Cliente</th>
                    <th>Emplazamiento</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Fecha Límite</th>
                    <th>Días Restantes</th>
                    <th>Valor Total</th>
                    <th>Estado</th>
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {depositos.map((deposito) => {
                    const clienteNombre = typeof deposito.emplazamiento !== 'string' && typeof deposito.emplazamiento.cliente !== 'string'
                      ? deposito.emplazamiento.cliente.nombre
                      : '-';
                    const emplazamientoNombre = typeof deposito.emplazamiento !== 'string'
                      ? deposito.emplazamiento.nombre
                      : '-';
                    const productoNombre = typeof deposito.producto !== 'string'
                      ? deposito.producto.nombre
                      : '-';

                    return (
                      <tr key={deposito._id}>
                        <td className="fw-semibold">{deposito.numeroDeposito}</td>
                        <td>{clienteNombre}</td>
                        <td>{emplazamientoNombre}</td>
                        <td>{productoNombre}</td>
                        <td>{deposito.cantidad}</td>
                        <td>{new Date(deposito.fechaVencimiento || '').toLocaleDateString('es-ES')}</td>
                        <td className={getDiasRestantesColor(deposito.diasHastaVencimiento)}>
                          {deposito.diasHastaVencimiento !== undefined
                            ? deposito.diasHastaVencimiento < 0
                              ? `Vencido hace ${Math.abs(deposito.diasHastaVencimiento)} días`
                              : `${deposito.diasHastaVencimiento} días`
                            : '-'}
                        </td>
                        <td className="fw-bold">€{deposito.valorTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                        <td>{getEstadoBadge(deposito.estado)}</td>
                        <td className="text-end">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-1"
                            onClick={() => handleOpenView(deposito)}
                          >
                            <i className="bi bi-eye"></i>
                          </Button>
                          {deposito.estado === 'activo' && (
                            <>
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                className="me-1"
                                onClick={() => handleOpenEdit(deposito)}
                              >
                                <i className="bi bi-pencil"></i>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDelete(deposito._id)}
                              >
                                <i className="bi bi-trash"></i>
                              </Button>
                            </>
                          )}
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

      {/* Modal Crear/Editar Depósito (Multi-paso) */}
      <Modal show={showModal} onHide={handleCloseModal} size="xl" backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>
            {modalMode === 'create' && 'Nuevo Depósito'}
            {modalMode === 'edit' && 'Editar Depósito'}
            {modalMode === 'view' && 'Detalle de Depósito'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalMode === 'view' && selectedDeposito ? (
            /* Vista de detalle */
            <div>
              <Row className="mb-4">
                <Col md={6}>
                  <h6 className="fw-bold mb-3">Información General</h6>
                  <p><strong>Número:</strong> {selectedDeposito.numeroDeposito}</p>
                  <p><strong>Estado:</strong> {getEstadoBadge(selectedDeposito.estado)}</p>
                  <p><strong>Fecha Creación:</strong> {new Date(selectedDeposito.createdAt).toLocaleDateString('es-ES')}</p>
                </Col>
                <Col md={6}>
                  <h6 className="fw-bold mb-3">Fechas</h6>
                  <p><strong>Fecha Inicio:</strong> {new Date(selectedDeposito.fechaDeposito).toLocaleDateString('es-ES')}</p>
                  <p><strong>Fecha Límite:</strong> {selectedDeposito.fechaVencimiento ? new Date(selectedDeposito.fechaVencimiento).toLocaleDateString('es-ES') : '-'}</p>
                  <p><strong>Días Restantes:</strong> <span className={getDiasRestantesColor(selectedDeposito.diasHastaVencimiento)}>
                    {selectedDeposito.diasHastaVencimiento !== undefined ? `${selectedDeposito.diasHastaVencimiento} días` : '-'}
                  </span></p>
                </Col>
              </Row>

              <h6 className="fw-bold mb-3">Valoración</h6>
              <Table bordered>
                <tbody>
                  <tr>
                    <td><strong>Cantidad:</strong></td>
                    <td>{selectedDeposito.cantidad}</td>
                  </tr>
                  <tr>
                    <td><strong>Valor Unitario:</strong></td>
                    <td>€{selectedDeposito.valorUnitario.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="table-light">
                    <td><strong>TOTAL VALORACIÓN:</strong></td>
                    <td className="fw-bold">€{selectedDeposito.valorTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </Table>

              {selectedDeposito.observaciones && (
                <>
                  <h6 className="fw-bold mb-2 mt-4">Observaciones</h6>
                  <p>{selectedDeposito.observaciones}</p>
                </>
              )}

              {selectedDeposito.estado === 'activo' && (
                <div className="mt-4 pt-3 border-top">
                  <h6 className="fw-bold mb-3">Acciones Disponibles</h6>
                  <Button
                    variant="warning"
                    className="me-2"
                    onClick={() => {
                      setShowExtenderPlazo(true);
                      setShowModal(false);
                    }}
                  >
                    <i className="bi bi-calendar-plus me-2"></i>
                    Extender Plazo
                  </Button>
                  <Button
                    variant="success"
                    className="me-2"
                    onClick={() => {
                      setShowMarcarFacturado(true);
                      setShowModal(false);
                    }}
                  >
                    <i className="bi bi-receipt me-2"></i>
                    Marcar como Facturado
                  </Button>
                  <Button
                    variant="info"
                    onClick={() => {
                      setShowMarcarDevuelto(true);
                      setShowModal(false);
                    }}
                  >
                    <i className="bi bi-box-arrow-left me-2"></i>
                    Marcar como Devuelto
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* Formulario multi-paso */
            <>
              {/* Progress bar */}
              <ProgressBar now={(currentStep / 3) * 100} className="mb-4" />
              <div className="mb-3 text-center">
                <strong>Paso {currentStep} de 3</strong>
              </div>

              {/* PASO 1: Información Básica */}
              {currentStep === 1 && (
                <div>
                  <h5 className="fw-bold mb-3">Paso 1: Información Básica</h5>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Cliente <span className="text-danger">*</span></Form.Label>
                        <Form.Select
                          value={clienteSeleccionado}
                          onChange={(e) => setClienteSeleccionado(e.target.value)}
                          required
                        >
                          <option value="">Seleccionar cliente...</option>
                          {clientes.map(cliente => (
                            <option key={cliente._id} value={cliente._id}>{cliente.nombre}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Emplazamiento <span className="text-danger">*</span></Form.Label>
                        <Form.Select
                          value={formData.emplazamiento}
                          onChange={(e) => setFormData({ ...formData, emplazamiento: e.target.value })}
                          disabled={!clienteSeleccionado}
                          required
                        >
                          <option value="">Seleccionar emplazamiento...</option>
                          {emplazamientosFiltrados.map(emp => (
                            <option key={emp._id} value={emp._id}>{emp.nombre}</option>
                          ))}
                        </Form.Select>
                        {!clienteSeleccionado && (
                          <Form.Text className="text-muted">Primero selecciona un cliente</Form.Text>
                        )}
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Fecha Inicio <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="date"
                          value={formData.fechaDeposito}
                          onChange={(e) => setFormData({ ...formData, fechaDeposito: e.target.value })}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Fecha Límite <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="date"
                          value={formData.fechaVencimiento}
                          onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value })}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Alert variant="info">
                        <i className="bi bi-info-circle me-2"></i>
                        <strong>Días de depósito:</strong> {calcularDiasDeposito()} días
                      </Alert>
                    </Col>
                  </Row>
                </div>
              )}

              {/* PASO 2: Productos */}
              {currentStep === 2 && (
                <div>
                  <h5 className="fw-bold mb-3">Paso 2: Productos</h5>
                  <Table bordered className="mb-3">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '40%' }}>Producto</th>
                        <th style={{ width: '15%' }}>Cantidad</th>
                        <th style={{ width: '20%' }}>Precio Unitario</th>
                        <th style={{ width: '20%' }}>Subtotal</th>
                        <th style={{ width: '5%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosFormulario.map((item, index) => {
                        const subtotal = item.cantidad * item.valorUnitario;
                        return (
                          <tr key={index}>
                            <td>
                              <Form.Select
                                value={item.producto}
                                onChange={(e) => handleUpdateProducto(index, 'producto', e.target.value)}
                                size="sm"
                              >
                                <option value="">Seleccionar...</option>
                                {productos.map(p => (
                                  <option key={p._id} value={p._id}>{p.nombre}</option>
                                ))}
                              </Form.Select>
                            </td>
                            <td>
                              <Form.Control
                                type="number"
                                min="1"
                                value={item.cantidad}
                                onChange={(e) => handleUpdateProducto(index, 'cantidad', parseInt(e.target.value) || 0)}
                                size="sm"
                              />
                            </td>
                            <td>
                              <InputGroup size="sm">
                                <InputGroup.Text>€</InputGroup.Text>
                                <Form.Control
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.valorUnitario}
                                  onChange={(e) => handleUpdateProducto(index, 'valorUnitario', parseFloat(e.target.value) || 0)}
                                />
                              </InputGroup>
                            </td>
                            <td className="fw-bold">
                              €{subtotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="text-center">
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleRemoveProducto(index)}
                                disabled={productosFormulario.length === 1}
                              >
                                <i className="bi bi-x"></i>
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="table-light">
                      <tr>
                        <td colSpan={3} className="text-end fw-bold">VALOR TOTAL DEPÓSITO:</td>
                        <td colSpan={2} className="fw-bold fs-5 text-primary">
                          €{calcularValorTotal().toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </Table>
                  <Button variant="outline-success" size="sm" onClick={handleAddProducto}>
                    <i className="bi bi-plus-circle me-2"></i>
                    Añadir Producto
                  </Button>
                </div>
              )}

              {/* PASO 3: Confirmación */}
              {currentStep === 3 && (
                <div>
                  <h5 className="fw-bold mb-3">Paso 3: Confirmación</h5>
                  <Alert variant="success">
                    <h6 className="fw-bold">Resumen del Depósito</h6>
                    <p className="mb-0"><strong>Cliente:</strong> {clientes.find(c => c._id === clienteSeleccionado)?.nombre}</p>
                    <p className="mb-0"><strong>Emplazamiento:</strong> {emplazamientos.find(e => e._id === formData.emplazamiento)?.nombre}</p>
                    <p className="mb-0"><strong>Período:</strong> {new Date(formData.fechaDeposito).toLocaleDateString('es-ES')} - {new Date(formData.fechaVencimiento).toLocaleDateString('es-ES')}</p>
                    <p className="mb-0"><strong>Productos:</strong> {productosFormulario.length} producto(s)</p>
                    <p className="mb-0 fs-5 mt-2"><strong>Valor Total:</strong> €{calcularValorTotal().toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                  </Alert>

                  <Form.Group>
                    <Form.Label>Notas Adicionales</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={formData.observaciones}
                      onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                      placeholder="Observaciones sobre este depósito..."
                    />
                  </Form.Group>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          {modalMode === 'view' ? (
            <Button variant="secondary" onClick={handleCloseModal}>
              Cerrar
            </Button>
          ) : (
            <>
              {currentStep > 1 && (
                <Button variant="outline-secondary" onClick={handlePrevStep}>
                  <i className="bi bi-arrow-left me-2"></i>
                  Anterior
                </Button>
              )}
              <Button variant="secondary" onClick={handleCloseModal}>
                Cancelar
              </Button>
              {currentStep < 3 ? (
                <Button variant="primary" onClick={handleNextStep}>
                  Siguiente
                  <i className="bi bi-arrow-right ms-2"></i>
                </Button>
              ) : (
                <Button variant="success" onClick={handleSave} disabled={loading}>
                  {loading ? <Spinner animation="border" size="sm" className="me-2" /> : <i className="bi bi-check-circle me-2"></i>}
                  {modalMode === 'create' ? 'Crear Depósito' : 'Guardar Cambios'}
                </Button>
              )}
            </>
          )}
        </Modal.Footer>
      </Modal>

      {/* Modal Extender Plazo */}
      <Modal show={showExtenderPlazo} onHide={() => setShowExtenderPlazo(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Extender Plazo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Nueva Fecha Límite <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="date"
              value={extenderPlazoData.nuevaFechaVencimiento}
              onChange={(e) => setExtenderPlazoData({ ...extenderPlazoData, nuevaFechaVencimiento: e.target.value })}
              required
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Justificación <span className="text-danger">*</span></Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={extenderPlazoData.observaciones}
              onChange={(e) => setExtenderPlazoData({ ...extenderPlazoData, observaciones: e.target.value })}
              placeholder="Indica el motivo de la extensión..."
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExtenderPlazo(false)}>
            Cancelar
          </Button>
          <Button variant="warning" onClick={handleExtenderPlazo} disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : 'Extender Plazo'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Marcar como Facturado */}
      <Modal show={showMarcarFacturado} onHide={() => setShowMarcarFacturado(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Marcar como Facturado</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Referencia de Factura <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="text"
              value={marcarFacturadoData.referenciaFactura}
              onChange={(e) => setMarcarFacturadoData({ ...marcarFacturadoData, referenciaFactura: e.target.value })}
              placeholder="Ej: FACT-2025-001"
              required
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Observaciones</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={marcarFacturadoData.observaciones}
              onChange={(e) => setMarcarFacturadoData({ ...marcarFacturadoData, observaciones: e.target.value })}
              placeholder="Notas adicionales..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMarcarFacturado(false)}>
            Cancelar
          </Button>
          <Button variant="success" onClick={handleMarcarFacturado} disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : 'Marcar como Facturado'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Marcar como Devuelto */}
      <Modal show={showMarcarDevuelto} onHide={() => setShowMarcarDevuelto(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Marcar como Devuelto</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Referencia de Albarán <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="text"
              value={marcarDevueltoData.referenciaAlbaran}
              onChange={(e) => setMarcarDevueltoData({ ...marcarDevueltoData, referenciaAlbaran: e.target.value })}
              placeholder="Ej: ALB-2025-001"
              required
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Observaciones</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={marcarDevueltoData.observaciones}
              onChange={(e) => setMarcarDevueltoData({ ...marcarDevueltoData, observaciones: e.target.value })}
              placeholder="Notas adicionales..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMarcarDevuelto(false)}>
            Cancelar
          </Button>
          <Button variant="info" onClick={handleMarcarDevuelto} disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : 'Marcar como Devuelto'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default DepositosPage;
