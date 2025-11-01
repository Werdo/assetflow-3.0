/**
 * AssetFlow 3.0 - Simplified Map View Component with Advanced Filtering
 * Vista de tabla con sistema completo de filtrado y paginación
 */

import React, { useState, useEffect } from 'react';
import { Card, Spinner, Alert, Button, Table, Form, Row, Col, InputGroup, Badge, Dropdown } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import clienteService from '../../services/clienteService';
import emplazamientoService from '../../services/emplazamientoService';
import type { EmplazamientoMapData, Cliente } from '../../types';

interface SimplifiedMapViewProps {
  emplazamientos: EmplazamientoMapData[];
  loading?: boolean;
  error?: string | null;
}

/**
 * Componente SimplifiedMapView - Vista de tabla con filtrado avanzado
 */
export const SimplifiedMapView: React.FC<SimplifiedMapViewProps> = ({
  emplazamientos,
  loading = false,
  error = null
}) => {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
  const [sortBy, setSortBy] = useState<string>('nombre');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Paginación
  const [itemsPerPage, setItemsPerPage] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Cargar clientes al montar
  useEffect(() => {
    const cargarClientes = async () => {
      try {
        const response = await clienteService.getAll({ limit: 1000 });
        setClientes(response.clientes);
      } catch (error) {
        console.error('Error cargando clientes:', error);
      }
    };
    cargarClientes();
  }, []);

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

  // Obtener subclientes disponibles
  const subclientes = clientes.filter(c => c.esSubcliente);

  // Manejar inactivación de emplazamiento
  const handleInactivar = async (emplazamientoId: string, nombre: string) => {
    if (!window.confirm(`¿Estás seguro de inactivar el emplazamiento "${nombre}"?`)) {
      return;
    }

    try {
      setActionLoading(emplazamientoId);
      await emplazamientoService.update(emplazamientoId, { estado: 'inactivo' });
      toast.success(`Emplazamiento "${nombre}" inactivado correctamente`);
      // Recargar página para actualizar datos
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || 'Error al inactivar emplazamiento');
    } finally {
      setActionLoading(null);
    }
  };

  // Navegar a depósitos del emplazamiento
  const handleVerDepositos = (emplazamientoId: string) => {
    navigate(`/depositos?emplazamiento=${emplazamientoId}`);
  };

  // Ver detalle del emplazamiento
  const handleVerDetalle = (emplazamientoId: string) => {
    navigate(`/emplazamientos/${emplazamientoId}`);
  };

  // Filtrado
  const emplazamientosFiltrados = emplazamientos.filter((e) => {
    // Búsqueda por texto
    const matchesSearch = searchTerm === '' ||
                         e.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         e.ciudad?.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro por estado - convertir estados del dashboard a formato comparable
    const estado = e.estado?.toLowerCase() || 'verde';
    const matchesEstado = filterEstado === 'all' ||
                         (filterEstado === 'activo' && (estado === 'verde' || estado === 'normal')) ||
                         (filterEstado === 'inactivo' && (estado === 'rojo' || estado === 'critico' || estado === 'amarillo'));

    // Filtro por cliente
    const clienteId = typeof e.cliente === 'string' ? e.cliente : e.cliente?._id;
    const matchesCliente = filterCliente === 'all' || clienteId === filterCliente;

    // Filtro por subcliente
    const subclienteId = (e as any).subcliente ? (typeof (e as any).subcliente === 'string' ? (e as any).subcliente : (e as any).subcliente._id) : null;
    const matchesSubcliente = filterSubcliente === 'all' || subclienteId === filterSubcliente;

    // Filtro por valor total
    const valor = e.valorTotal || 0;
    const matchesValorMin = filterValorMin === '' || valor >= parseFloat(filterValorMin);
    const matchesValorMax = filterValorMax === '' || valor <= parseFloat(filterValorMax);

    // Filtro por depósitos activos
    const depositos = e.depositosActivos || 0;
    const matchesDepositosMin = filterDepositosMin === '' || depositos >= parseInt(filterDepositosMin);
    const matchesDepositosMax = filterDepositosMax === '' || depositos <= parseInt(filterDepositosMax);

    // Filtro por días mínimos
    const diasMin = (e as any).diasMinimosRestantes;
    const matchesDiasMin = filterDiasMin === '' || (diasMin !== null && diasMin !== undefined && diasMin >= parseInt(filterDiasMin));

    return matchesSearch && matchesEstado && matchesCliente && matchesSubcliente &&
           matchesValorMin && matchesValorMax && matchesDepositosMin && matchesDepositosMax && matchesDiasMin;
  });

  // Ordenamiento
  const emplazamientosOrdenados = [...emplazamientosFiltrados].sort((a, b) => {
    let aVal: any;
    let bVal: any;

    switch (sortBy) {
      case 'nombre':
        aVal = a.nombre || '';
        bVal = b.nombre || '';
        break;
      case 'ciudad':
        aVal = a.ciudad || '';
        bVal = b.ciudad || '';
        break;
      case 'valorTotal':
        aVal = a.valorTotal || 0;
        bVal = b.valorTotal || 0;
        break;
      case 'depositosActivos':
        aVal = a.depositosActivos || 0;
        bVal = b.depositosActivos || 0;
        break;
      case 'diasMinimo':
        aVal = (a as any).diasMinimosRestantes === null || (a as any).diasMinimosRestantes === undefined ? Infinity : (a as any).diasMinimosRestantes;
        bVal = (b as any).diasMinimosRestantes === null || (b as any).diasMinimosRestantes === undefined ? Infinity : (b as any).diasMinimosRestantes;
        break;
      default:
        aVal = a.nombre || '';
        bVal = b.nombre || '';
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

  if (loading) {
    return (
      <Card className="h-100">
        <Card.Header className="bg-white border-bottom">
          <h5 className="mb-0">Vista de Emplazamientos</h5>
        </Card.Header>
        <Card.Body className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3 text-muted">Cargando datos...</p>
          </div>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-100">
        <Card.Header className="bg-white border-bottom">
          <h5 className="mb-0">Vista de Emplazamientos</h5>
        </Card.Header>
        <Card.Body>
          <Alert variant="danger">
            <Alert.Heading>Error al cargar datos</Alert.Heading>
            <p>{error}</p>
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="h-100">
      <Card.Header className="bg-white border-bottom">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">Vista de Emplazamientos</h5>
            <small className="text-muted">{emplazamientos.length} emplazamientos totales</small>
          </div>
        </div>
      </Card.Header>
      <Card.Body className="p-3">
        {/* Filtros Row 1 */}
        <Row className="mb-2">
          <Col md={4}>
            <InputGroup size="sm">
              <InputGroup.Text><i className="bi bi-search"></i></InputGroup.Text>
              <Form.Control
                placeholder="Buscar por nombre o ciudad..."
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
              <option value="activo">Normal</option>
              <option value="inactivo">Advertencia/Crítico</option>
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
            <div className="small text-muted text-center">
              {emplazamientosOrdenados.length} resultados
            </div>
          </Col>
        </Row>

        {emplazamientosOrdenados.length === 0 ? (
          <Alert variant="info">
            No se encontraron emplazamientos con los filtros aplicados.
          </Alert>
        ) : (
          <div className="table-responsive">
            <Table hover className="mb-0" size="sm">
              <thead className="table-light">
                <tr>
                  <th onClick={() => handleSort('nombre')} style={{ cursor: 'pointer' }}>
                    Nombre {sortBy === 'nombre' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Cliente / Subcliente</th>
                  <th onClick={() => handleSort('ciudad')} style={{ cursor: 'pointer' }}>
                    Ciudad {sortBy === 'ciudad' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('valorTotal')} style={{ cursor: 'pointer' }} className="text-end">
                    Valor Total {sortBy === 'valorTotal' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('depositosActivos')} style={{ cursor: 'pointer' }} className="text-center">
                    Depósitos {sortBy === 'depositosActivos' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('diasMinimo')} style={{ cursor: 'pointer' }} className="text-center">
                    Días Mín {sortBy === 'diasMinimo' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-center">Estado</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {emplazamientosPaginados.map((emp) => {
                  const diasMin = (emp as any).diasMinimosRestantes;
                  const estado = emp.estado?.toLowerCase() || 'verde';

                  return (
                    <tr key={emp._id}>
                      <td><strong>{emp.nombre}</strong></td>
                      <td>
                        {(emp as any).subcliente ? (
                          <div>
                            <div><strong className="small">{(emp as any).subcliente.clientePrincipal?.nombre || emp.cliente?.nombre}</strong></div>
                            <small className="text-muted">└ {(emp as any).subcliente.nombre}</small>
                          </div>
                        ) : (
                          <span className="small">{emp.cliente?.nombre || 'N/A'}</span>
                        )}
                      </td>
                      <td className="small">{emp.ciudad || '-'}{emp.provincia ? `, ${emp.provincia}` : ''}</td>
                      <td className="text-end">
                        <strong className="text-success">
                          €{(emp.valorTotal || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </strong>
                      </td>
                      <td className="text-center">
                        <Badge bg="info">{emp.depositosActivos || 0}</Badge>
                      </td>
                      <td className="text-center">
                        {diasMin !== null && diasMin !== undefined ? (
                          <Badge bg={
                            diasMin < 7 ? 'danger' :
                            diasMin < 30 ? 'warning' :
                            'success'
                          }>
                            {diasMin} días
                          </Badge>
                        ) : (
                          <span className="text-muted small">N/A</span>
                        )}
                      </td>
                      <td className="text-center">
                        <Badge bg={
                          estado === 'verde' || estado === 'normal' ? 'success' :
                          estado === 'amarillo' || estado === 'warning' ? 'warning' :
                          'danger'
                        } className="small">
                          {estado === 'verde' || estado === 'normal' ? 'Normal' :
                           estado === 'amarillo' || estado === 'warning' ? 'Advertencia' :
                           'Crítico'}
                        </Badge>
                      </td>
                      <td className="text-center">
                        <Dropdown>
                          <Dropdown.Toggle
                            variant="outline-primary"
                            size="sm"
                            id={`dropdown-${emp._id}`}
                            disabled={actionLoading === emp._id}
                          >
                            {actionLoading === emp._id ? (
                              <Spinner animation="border" size="sm" />
                            ) : (
                              <>
                                <i className="bi bi-three-dots-vertical"></i>
                                <span className="ms-1">Acciones</span>
                              </>
                            )}
                          </Dropdown.Toggle>

                          <Dropdown.Menu>
                            <Dropdown.Item onClick={() => handleVerDetalle(emp._id)}>
                              <i className="bi bi-eye me-2"></i>
                              Ver Detalle
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => handleVerDepositos(emp._id)}>
                              <i className="bi bi-box-seam me-2"></i>
                              Ver Depósitos ({emp.depositosActivos || 0})
                            </Dropdown.Item>
                            <Dropdown.Divider />
                            <Dropdown.Item
                              onClick={() => handleInactivar(emp._id, emp.nombre)}
                              className="text-danger"
                            >
                              <i className="bi bi-x-circle me-2"></i>
                              Inactivar Emplazamiento
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      </td>
                    </tr>
                  );
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
  );
};

export default SimplifiedMapView;
