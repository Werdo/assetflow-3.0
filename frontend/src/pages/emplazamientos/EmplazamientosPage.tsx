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
  const [geocoding, setGeocoding] = useState(false);

  // Columnas visibles
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'codigo', 'nombre', 'cliente', 'ciudad', 'valorTotal', 'depositos', 'unidades', 'diasMin', 'estado'
  ]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [filterCliente, setFilterCliente] = useState<string>('all');
  const [filterSubcliente, setFilterSubcliente] = useState<string>('all');
  const [filterValorMin, setFilterValorMin] = useState<string>('');
  const [filterValorMax, setFilterValorMax] = useState<string>('');
  const [filterDepositosMin, setFilterDepositosMin] = useState<string>('');
  const [filterDepositosMax, setFilterDepositosMax] = useState<string>('');
  const [filterDiasMin, setFilterDiasMin] = useState<string>('');

  // Ordenamiento
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Paginación
  const [itemsPerPage, setItemsPerPage] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

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

      // Convertir coordenadas de GeoJSON a formato lat/lng si es necesario
      let coordenadas = { lat: 40.4168, lng: -3.7038 }; // Default Madrid
      if (emplazamiento.coordenadas) {
        if ('coordinates' in emplazamiento.coordenadas && Array.isArray(emplazamiento.coordenadas.coordinates)) {
          // Formato GeoJSON: coordinates = [lng, lat]
          coordenadas = {
            lng: emplazamiento.coordenadas.coordinates[0],
            lat: emplazamiento.coordenadas.coordinates[1]
          };
        } else if ('lat' in emplazamiento.coordenadas && 'lng' in emplazamiento.coordenadas) {
          // Ya está en formato lat/lng
          coordenadas = {
            lat: emplazamiento.coordenadas.lat,
            lng: emplazamiento.coordenadas.lng
          };
        }
      }

      setFormData({
        codigo: emplazamiento.codigo,
        nombre: emplazamiento.nombre,
        cliente: typeof emplazamiento.cliente === 'string' ? emplazamiento.cliente : emplazamiento.cliente._id,
        direccion: emplazamiento.direccion,
        ciudad: emplazamiento.ciudad,
        codigoPostal: emplazamiento.codigoPostal || '',
        provincia: emplazamiento.provincia || '',
        pais: emplazamiento.pais || 'España',
        coordenadas: coordenadas,
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
        // No enviar código al crear - se genera automáticamente en el backend
        const { codigo, ...dataToSend } = formData;
        await emplazamientoService.create(dataToSend);
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

  // Helper para ordenar
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  // Toggle column visibility
  const toggleColumn = (column: string) => {
    if (visibleColumns.includes(column)) {
      setVisibleColumns(visibleColumns.filter(col => col !== column));
    } else {
      setVisibleColumns([...visibleColumns, column]);
    }
  };

  // Obtener subclientes disponibles
  const subclientes = clientes.filter(c => c.esSubcliente);

  // Filtrado
  const emplazamientosFiltrados = emplazamientos.filter((e) => {
    // Búsqueda por texto
    const matchesSearch = searchTerm === '' ||
                         e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         e.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         e.ciudad.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro por estado
    const matchesEstado = filterEstado === 'all' || e.estado === filterEstado;

    // Filtro por cliente: incluir emplazamientos del cliente Y de sus subclientes
    let matchesCliente = filterCliente === 'all';
    if (!matchesCliente && filterCliente !== 'all') {
      const clienteId = typeof e.cliente === 'string' ? e.cliente : e.cliente?._id;
      const subclienteId = typeof e.subcliente === 'string' ? e.subcliente : e.subcliente?._id;

      // Match si el cliente es el seleccionado
      matchesCliente = clienteId === filterCliente;

      // O si el subcliente pertenece al cliente seleccionado
      if (!matchesCliente && subclienteId) {
        const subcliente = clientes.find(c => c._id === subclienteId);
        const clientePrincipalId = typeof subcliente?.clientePrincipal === 'string'
          ? subcliente.clientePrincipal
          : subcliente?.clientePrincipal?._id;
        matchesCliente = clientePrincipalId === filterCliente;
      }
    }

    // Filtro por subcliente
    const matchesSubcliente = filterSubcliente === 'all' ||
                             (e.subcliente && (typeof e.subcliente === 'string' ? e.subcliente === filterSubcliente : e.subcliente._id === filterSubcliente));

    // Filtro por valor total
    const valor = e.valorTotal || 0;
    const matchesValorMin = filterValorMin === '' || valor >= parseFloat(filterValorMin);
    const matchesValorMax = filterValorMax === '' || valor <= parseFloat(filterValorMax);

    // Filtro por depósitos activos
    const depositos = e.depositosActivos || 0;
    const matchesDepositosMin = filterDepositosMin === '' || depositos >= parseInt(filterDepositosMin);
    const matchesDepositosMax = filterDepositosMax === '' || depositos <= parseInt(filterDepositosMax);

    // Filtro por días mínimos
    const matchesDiasMin = filterDiasMin === '' || (e.diasMinimo !== null && e.diasMinimo !== undefined && e.diasMinimo >= parseInt(filterDiasMin));

    return matchesSearch && matchesEstado && matchesCliente && matchesSubcliente &&
           matchesValorMin && matchesValorMax && matchesDepositosMin && matchesDepositosMax && matchesDiasMin;
  });

  // Ordenamiento
  const emplazamientosOrdenados = [...emplazamientosFiltrados].sort((a, b) => {
    let aVal: any;
    let bVal: any;

    switch (sortBy) {
      case 'codigo':
        aVal = a.codigo;
        bVal = b.codigo;
        break;
      case 'nombre':
        aVal = a.nombre;
        bVal = b.nombre;
        break;
      case 'ciudad':
        aVal = a.ciudad;
        bVal = b.ciudad;
        break;
      case 'valorTotal':
        aVal = a.valorTotal || 0;
        bVal = b.valorTotal || 0;
        break;
      case 'depositosActivos':
        aVal = a.depositosActivos || 0;
        bVal = b.depositosActivos || 0;
        break;
      case 'unidades':
        aVal = (a as any).totalUnidades || 0;
        bVal = (b as any).totalUnidades || 0;
        break;
      case 'diasMinimo':
        aVal = a.diasMinimo === null || a.diasMinimo === undefined ? Infinity : a.diasMinimo;
        bVal = b.diasMinimo === null || b.diasMinimo === undefined ? Infinity : b.diasMinimo;
        break;
      case 'createdAt':
      default:
        aVal = new Date(a.createdAt);
        bVal = new Date(b.createdAt);
        break;
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Paginación
  const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(emplazamientosOrdenados.length / itemsPerPage);
  const startIndex = itemsPerPage === -1 ? 0 : (currentPage - 1) * itemsPerPage;
  const endIndex = itemsPerPage === -1 ? emplazamientosOrdenados.length : startIndex + itemsPerPage;
  const emplazamientosPaginados = emplazamientosOrdenados.slice(startIndex, endIndex);

  const getClienteNombre = (cliente: string | Cliente): string => {
    if (typeof cliente === 'string') {
      const found = clientes.find(c => c._id === cliente);
      return found ? found.nombre : 'N/A';
    }
    return cliente.nombre;
  };

  const getSubclienteNombre = (subcliente: string | Cliente | undefined): string | null => {
    if (!subcliente) return null;
    if (typeof subcliente === 'string') {
      const found = clientes.find(c => c._id === subcliente);
      return found ? found.nombre : null;
    }
    return subcliente.nombre;
  };

  const getClientePrincipalFromSubcliente = (subcliente: string | Cliente | undefined): string | null => {
    if (!subcliente || typeof subcliente === 'string') return null;
    if (subcliente.clientePrincipal) {
      if (typeof subcliente.clientePrincipal === 'string') {
        const found = clientes.find(c => c._id === subcliente.clientePrincipal);
        return found ? found.nombre : null;
      }
      return subcliente.clientePrincipal.nombre;
    }
    return null;
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
            <div className="d-flex gap-2">
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" size="sm" id="dropdown-columns">
                  <i className="bi bi-layout-three-columns me-2"></i>
                  Columnas
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Header>Seleccionar columnas visibles</Dropdown.Header>
                  <Dropdown.Item onClick={() => toggleColumn('codigo')}>
                    <Form.Check
                      type="checkbox"
                      label="Código"
                      checked={visibleColumns.includes('codigo')}
                      onChange={() => {}}
                      className="d-inline-block"
                    />
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => toggleColumn('nombre')}>
                    <Form.Check
                      type="checkbox"
                      label="Nombre"
                      checked={visibleColumns.includes('nombre')}
                      onChange={() => {}}
                      className="d-inline-block"
                    />
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => toggleColumn('cliente')}>
                    <Form.Check
                      type="checkbox"
                      label="Cliente"
                      checked={visibleColumns.includes('cliente')}
                      onChange={() => {}}
                      className="d-inline-block"
                    />
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => toggleColumn('ciudad')}>
                    <Form.Check
                      type="checkbox"
                      label="Ciudad"
                      checked={visibleColumns.includes('ciudad')}
                      onChange={() => {}}
                      className="d-inline-block"
                    />
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => toggleColumn('valorTotal')}>
                    <Form.Check
                      type="checkbox"
                      label="Valor Total"
                      checked={visibleColumns.includes('valorTotal')}
                      onChange={() => {}}
                      className="d-inline-block"
                    />
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => toggleColumn('depositos')}>
                    <Form.Check
                      type="checkbox"
                      label="Depósitos"
                      checked={visibleColumns.includes('depositos')}
                      onChange={() => {}}
                      className="d-inline-block"
                    />
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => toggleColumn('unidades')}>
                    <Form.Check
                      type="checkbox"
                      label="Unidades"
                      checked={visibleColumns.includes('unidades')}
                      onChange={() => {}}
                      className="d-inline-block"
                    />
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => toggleColumn('diasMin')}>
                    <Form.Check
                      type="checkbox"
                      label="Días Mín"
                      checked={visibleColumns.includes('diasMin')}
                      onChange={() => {}}
                      className="d-inline-block"
                    />
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => toggleColumn('estado')}>
                    <Form.Check
                      type="checkbox"
                      label="Estado"
                      checked={visibleColumns.includes('estado')}
                      onChange={() => {}}
                      className="d-inline-block"
                    />
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
              <Button variant="primary" onClick={() => handleShowModal()}>
                <i className="bi bi-plus-circle me-2"></i>
                Nuevo Emplazamiento
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Filtros Row 1 */}
      <Row className="mb-3">
        <Col md={4}>
          <InputGroup size="sm">
            <InputGroup.Text><i className="bi bi-search"></i></InputGroup.Text>
            <Form.Control
              placeholder="Buscar por nombre, código o ciudad..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </InputGroup>
        </Col>
        <Col md={2}>
          <Form.Select size="sm" value={filterCliente} onChange={(e) => { setFilterCliente(e.target.value); setCurrentPage(1); }}>
            <option value="all">Todos los clientes</option>
            {clientes.filter(c => !c.esSubcliente).map(cliente => (
              <option key={cliente._id} value={cliente._id}>{cliente.nombre}</option>
            ))}
          </Form.Select>
        </Col>
        <Col md={2}>
          <Form.Select size="sm" value={filterSubcliente} onChange={(e) => { setFilterSubcliente(e.target.value); setCurrentPage(1); }}>
            <option value="all">Todos los subclientes</option>
            {subclientes.map(subcliente => (
              <option key={subcliente._id} value={subcliente._id}>{subcliente.nombre}</option>
            ))}
          </Form.Select>
        </Col>
        <Col md={2}>
          <Form.Select size="sm" value={filterEstado} onChange={(e) => { setFilterEstado(e.target.value); setCurrentPage(1); }}>
            <option value="all">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </Form.Select>
        </Col>
        <Col md={2}>
          <Form.Select size="sm" value={itemsPerPage} onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}>
            <option value="50">50 por página</option>
            <option value="100">100 por página</option>
            <option value="200">200 por página</option>
            <option value="-1">Todos</option>
          </Form.Select>
        </Col>
      </Row>

      {/* Filtros Row 2 - Rangos numéricos */}
      <Row className="mb-3">
        <Col md={2}>
          <Form.Control
            type="number"
            size="sm"
            placeholder="Valor mín €"
            value={filterValorMin}
            onChange={(e) => { setFilterValorMin(e.target.value); setCurrentPage(1); }}
          />
        </Col>
        <Col md={2}>
          <Form.Control
            type="number"
            size="sm"
            placeholder="Valor máx €"
            value={filterValorMax}
            onChange={(e) => { setFilterValorMax(e.target.value); setCurrentPage(1); }}
          />
        </Col>
        <Col md={2}>
          <Form.Control
            type="number"
            size="sm"
            placeholder="Depósitos mín"
            value={filterDepositosMin}
            onChange={(e) => { setFilterDepositosMin(e.target.value); setCurrentPage(1); }}
          />
        </Col>
        <Col md={2}>
          <Form.Control
            type="number"
            size="sm"
            placeholder="Depósitos máx"
            value={filterDepositosMax}
            onChange={(e) => { setFilterDepositosMax(e.target.value); setCurrentPage(1); }}
          />
        </Col>
        <Col md={2}>
          <Form.Control
            type="number"
            size="sm"
            placeholder="Días mín venc."
            value={filterDiasMin}
            onChange={(e) => { setFilterDiasMin(e.target.value); setCurrentPage(1); }}
          />
        </Col>
        <Col md={2}>
          <Button variant="outline-secondary" size="sm" className="w-100" onClick={cargarDatos}>
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
              ) : emplazamientosOrdenados.length === 0 ? (
                <Alert variant="info" className="m-4">
                  No se encontraron emplazamientos. {searchTerm && 'Intenta con otros términos de búsqueda.'}
                </Alert>
              ) : (
                <div className="table-responsive">
                  <Table hover className="mb-0" size="sm">
                    <thead className="table-light">
                      <tr>
                        {visibleColumns.includes('codigo') && (
                          <th onClick={() => handleSort('codigo')} style={{ cursor: 'pointer' }}>
                            Código {sortBy === 'codigo' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </th>
                        )}
                        {visibleColumns.includes('nombre') && (
                          <th onClick={() => handleSort('nombre')} style={{ cursor: 'pointer' }}>
                            Nombre {sortBy === 'nombre' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </th>
                        )}
                        {visibleColumns.includes('cliente') && (
                          <th>Cliente / Subcliente</th>
                        )}
                        {visibleColumns.includes('ciudad') && (
                          <th onClick={() => handleSort('ciudad')} style={{ cursor: 'pointer' }}>
                            Ciudad {sortBy === 'ciudad' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </th>
                        )}
                        {visibleColumns.includes('valorTotal') && (
                          <th onClick={() => handleSort('valorTotal')} style={{ cursor: 'pointer' }} className="text-end">
                            Valor Total {sortBy === 'valorTotal' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </th>
                        )}
                        {visibleColumns.includes('depositos') && (
                          <th onClick={() => handleSort('depositosActivos')} style={{ cursor: 'pointer' }} className="text-center">
                            Depósitos {sortBy === 'depositosActivos' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </th>
                        )}
                        {visibleColumns.includes('unidades') && (
                          <th onClick={() => handleSort('unidades')} style={{ cursor: 'pointer' }} className="text-center">
                            Unidades {sortBy === 'unidades' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </th>
                        )}
                        {visibleColumns.includes('diasMin') && (
                          <th onClick={() => handleSort('diasMinimo')} style={{ cursor: 'pointer' }} className="text-center">
                            Días Mín {sortBy === 'diasMinimo' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </th>
                        )}
                        {visibleColumns.includes('estado') && (
                          <th className="text-center">Estado</th>
                        )}
                        <th className="text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emplazamientosPaginados.map((emplazamiento) => {
                        const clientePrincipal = getClientePrincipalFromSubcliente(emplazamiento.subcliente);
                        const subclienteNombre = getSubclienteNombre(emplazamiento.subcliente);

                        return (
                          <tr key={emplazamiento._id}>
                            {visibleColumns.includes('codigo') && (
                              <td><code className="small">{emplazamiento.codigo}</code></td>
                            )}
                            {visibleColumns.includes('nombre') && (
                              <td><strong>{emplazamiento.nombre}</strong></td>
                            )}
                            {visibleColumns.includes('cliente') && (
                              <td>
                                {clientePrincipal && subclienteNombre ? (
                                  <div>
                                    <div><strong className="small">{clientePrincipal}</strong></div>
                                    <small className="text-muted">└ {subclienteNombre}</small>
                                  </div>
                                ) : (
                                  <span className="small">{getClienteNombre(emplazamiento.cliente)}</span>
                                )}
                              </td>
                            )}
                            {visibleColumns.includes('ciudad') && (
                              <td className="small">{emplazamiento.ciudad}</td>
                            )}
                            {visibleColumns.includes('valorTotal') && (
                              <td className="text-end">
                                <strong className="text-success">
                                  €{(emplazamiento.valorTotal || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                </strong>
                              </td>
                            )}
                            {visibleColumns.includes('depositos') && (
                              <td className="text-center">
                                <Badge bg="info">{emplazamiento.depositosActivos || 0}</Badge>
                              </td>
                            )}
                            {visibleColumns.includes('unidades') && (
                              <td className="text-center">
                                <Badge bg="secondary">{(emplazamiento as any).totalUnidades || 0}</Badge>
                              </td>
                            )}
                            {visibleColumns.includes('diasMin') && (
                              <td className="text-center">
                                {emplazamiento.diasMinimo !== null && emplazamiento.diasMinimo !== undefined ? (
                                  <Badge bg={
                                    emplazamiento.diasMinimo < 7 ? 'danger' :
                                    emplazamiento.diasMinimo < 30 ? 'warning' :
                                    'success'
                                  }>
                                    {emplazamiento.diasMinimo} días
                                  </Badge>
                                ) : (
                                  <span className="text-muted small">N/A</span>
                                )}
                              </td>
                            )}
                            {visibleColumns.includes('estado') && (
                              <td className="text-center">
                                <Badge bg={emplazamiento.estado === 'activo' ? 'success' : 'secondary'} className="small">
                                  {emplazamiento.estado === 'activo' ? 'Activo' : 'Inactivo'}
                                </Badge>
                              </td>
                            )}
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
                        )
                      })}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
            <Card.Footer className="bg-light">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <small className="text-muted">
                  Mostrando {itemsPerPage === -1 ? emplazamientosOrdenados.length : Math.min(startIndex + 1, emplazamientosOrdenados.length)} - {itemsPerPage === -1 ? emplazamientosOrdenados.length : Math.min(endIndex, emplazamientosOrdenados.length)} de {emplazamientosOrdenados.length} emplazamiento{emplazamientosOrdenados.length !== 1 ? 's' : ''}
                  {emplazamientosOrdenados.length !== emplazamientos.length && ` (${emplazamientos.length} total)`}
                </small>
                {itemsPerPage !== -1 && totalPages > 1 && (
                  <div className="d-flex gap-2 align-items-center">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <i className="bi bi-chevron-left"></i>
                    </Button>
                    <small className="text-muted">
                      Página {currentPage} de {totalPages}
                    </small>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <i className="bi bi-chevron-right"></i>
                    </Button>
                  </div>
                )}
              </div>
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
                  {editingEmplazamiento && (
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Código</Form.Label>
                        <Form.Control
                          type="text"
                          value={formData.codigo}
                          disabled
                          placeholder="EMP-OMN-0000001"
                          readOnly
                        />
                        <Form.Text className="text-muted">
                          Generado automáticamente
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  )}
                  <Col md={editingEmplazamiento ? 6 : 12}>
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
