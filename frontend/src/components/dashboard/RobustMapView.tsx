/**
 * AssetFlow 3.0 - Robust Map View Component
 * Mapa con Leaflet + OpenStreetMap con manejo robusto de errores
 */

import React, { useEffect, useState, useRef } from 'react';
import { Card, Spinner, Alert, Button, Row, Col, Form, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import clienteService from '../../services/clienteService';
import type { EmplazamientoMapData, Cliente } from '../../types';

interface RobustMapViewProps {
  emplazamientos: EmplazamientoMapData[];
  loading?: boolean;
  error?: string | null;
}

/**
 * Componente RobustMapView - Mapa con carga lazy de Leaflet
 */
export const RobustMapView: React.FC<RobustMapViewProps> = ({
  emplazamientos,
  loading = false,
  error = null
}) => {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Clientes para filtros
  const [clientes, setClientes] = useState<Cliente[]>([]);

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

  // Cargar Leaflet dinámicamente
  useEffect(() => {
    const loadLeaflet = async () => {
      try {
        // Importar Leaflet dinámicamente
        const L = await import('leaflet');

        // Importar CSS de Leaflet
        await import('leaflet/dist/leaflet.css');

        // Fix para iconos de Leaflet en Vite
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        setLeafletLoaded(true);
      } catch (err) {
        console.error('[RobustMapView] Error loading Leaflet:', err);
        setMapError('Error cargando la biblioteca de mapas');
      } finally {
        setMapLoading(false);
      }
    };

    loadLeaflet();
  }, []);

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

  // Obtener subclientes disponibles
  const subclientes = clientes.filter(c => c.esSubcliente);

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

    // Filtro por cliente: incluir emplazamientos del cliente Y de sus subclientes
    let matchesCliente = filterCliente === 'all';
    if (!matchesCliente && filterCliente !== 'all') {
      const clienteId = typeof e.cliente === 'string' ? e.cliente : e.cliente?._id;
      const subclienteId = typeof (e as any).subcliente === 'string' ? (e as any).subcliente : (e as any).subcliente?._id;

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

    // Filtro por subcliente: solo emplazamientos de ese subcliente específico
    let matchesSubcliente = filterSubcliente === 'all';
    if (!matchesSubcliente && filterSubcliente !== 'all') {
      const subclienteId = typeof (e as any).subcliente === 'string' ? (e as any).subcliente : (e as any).subcliente?._id;
      matchesSubcliente = subclienteId === filterSubcliente;
    }

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

  // Inicializar mapa cuando Leaflet esté cargado
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || emplazamientosFiltrados.length === 0) {
      return;
    }

    const initMap = async () => {
      try {
        const L = await import('leaflet');

        // Limpiar mapa anterior si existe
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
        }

        // Crear mapa
        const map = L.map(mapContainerRef.current!, {
          center: [40.4168, -3.7038], // Madrid por defecto
          zoom: 6,
          scrollWheelZoom: true,
        });

        // Añadir capa de tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        // Añadir marcadores
        const bounds: [number, number][] = [];

        console.log(`[RobustMapView] Añadiendo ${emplazamientosFiltrados.length} emplazamientos al mapa (${emplazamientos.length} total)`);

        emplazamientosFiltrados.forEach((emp, index) => {
          if (!emp.coordenadas || !emp.coordenadas.lat || !emp.coordenadas.lng) {
            console.warn('[RobustMapView] Emplazamiento sin coordenadas:', emp._id, emp.nombre);
            return;
          }

          const lat = emp.coordenadas.lat;
          const lng = emp.coordenadas.lng;

          console.log(`[RobustMapView] Procesando marcador ${index + 1}/${emplazamientosFiltrados.length}:`, {
            nombre: emp.nombre,
            lat,
            lng,
            estado: emp.estado
          });

          bounds.push([lat, lng]);

          // Determinar color según estado
          let color = '#28a745'; // Verde por defecto
          const estado = emp.estado?.toLowerCase() || 'verde';

          if (estado === 'critico' || estado === 'rojo' || estado === 'vencido') {
            color = '#dc3545'; // Rojo
          } else if (estado === 'proximo_vencimiento' || estado === 'amarillo' || estado === 'advertencia') {
            color = '#ffc107'; // Amarillo
          } else if (estado === 'verde' || estado === 'normal' || estado === 'ok') {
            color = '#28a745'; // Verde
          }

          // Usar icono por defecto de Leaflet con color personalizado
          const icon = L.divIcon({
            className: 'custom-map-marker',
            html: `
              <div style="
                width: 30px;
                height: 30px;
                background-color: ${color};
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 3px 6px rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
              ">
                <div style="
                  width: 12px;
                  height: 12px;
                  background-color: white;
                  border-radius: 50%;
                "></div>
              </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -15],
          });

          // Crear marcador
          const marker = L.marker([lat, lng], { icon });

          // Tooltip on hover (onmouseover)
          const tooltipContent = `
            <div style="padding: 4px;">
              <strong>${emp.nombre}</strong><br />
              <small>${emp.cliente?.nombre || 'Sin cliente'}</small><br />
              <small><strong>${emp.depositosActivos || 0}</strong> depósitos - <strong>€${(emp.valorTotal || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong></small>
            </div>
          `;
          marker.bindTooltip(tooltipContent, {
            permanent: false,
            direction: 'top',
            offset: [0, -10]
          });

          // Popup on click con información detallada
          const popupContent = `
            <div style="min-width: 250px;">
              <h6 style="font-weight: bold; margin-bottom: 8px;">${emp.nombre}</h6>
              <hr style="margin: 8px 0;" />
              <div style="margin-bottom: 8px;">
                <small style="color: #6c757d;">Cliente</small><br />
                <strong>${emp.cliente?.nombre || 'Sin cliente'}</strong>
              </div>
              <div style="margin-bottom: 8px;">
                <small style="color: #6c757d;">Ubicación</small><br />
                ${emp.ciudad || ''}${emp.provincia ? `, ${emp.provincia}` : ''}
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <div>
                  <small style="color: #6c757d;">Depósitos</small><br />
                  <strong style="color: #007bff;">${emp.depositosActivos || 0}</strong>
                </div>
                <div>
                  <small style="color: #6c757d;">Valor Total</small><br />
                  <strong style="color: #28a745;">€${(emp.valorTotal || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>
            </div>
          `;

          marker.bindPopup(popupContent);

          // Añadir al mapa EXPLÍCITAMENTE
          marker.addTo(map);

          console.log(`[RobustMapView] ✓ Marcador ${index + 1} añadido al mapa:`, emp.nombre);
        });

        console.log(`[RobustMapView] Total de ${bounds.length} marcadores añadidos al mapa`);

        // Ajustar vista a los marcadores
        if (bounds.length > 0) {
          map.fitBounds(bounds as any, { padding: [50, 50] });
        }

        mapInstanceRef.current = map;

      } catch (err) {
        console.error('[RobustMapView] Error inicializando mapa:', err);
        setMapError('Error inicializando el mapa');
      }
    };

    initMap();

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletLoaded, emplazamientosFiltrados, emplazamientos, searchTerm, filterEstado, filterCliente, filterSubcliente, filterValorMin, filterValorMax, filterDepositosMin, filterDepositosMax, filterDiasMin]);

  // Estados de carga y error
  if (loading || mapLoading) {
    return (
      <Card className="h-100">
        <Card.Body className="d-flex justify-content-center align-items-center">
          <div className="text-center">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3 text-muted">Cargando mapa...</p>
          </div>
        </Card.Body>
      </Card>
    );
  }

  if (error || mapError) {
    return (
      <Card className="h-100">
        <Card.Body>
          <Alert variant="danger">
            <Alert.Heading>Error al cargar el mapa</Alert.Heading>
            <p>{error || mapError}</p>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Reintentar
            </Button>
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  if (emplazamientos.length === 0) {
    return (
      <Card className="h-100">
        <Card.Body className="d-flex justify-content-center align-items-center">
          <div className="text-center">
            <i className="bi bi-geo-alt" style={{ fontSize: '4rem', color: '#6c757d' }}></i>
            <h5 className="mt-3 text-muted">No hay emplazamientos para mostrar</h5>
            <p className="text-muted">Crea tu primer emplazamiento para verlo en el mapa</p>
            <Button variant="primary" onClick={() => navigate('/emplazamientos/nuevo')}>
              Crear Emplazamiento
            </Button>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="h-100">
      <Card.Header className="bg-white border-bottom">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <h5 className="mb-0">Mapa de Emplazamientos</h5>
            <small className="text-muted">{emplazamientosFiltrados.length} emplazamientos mostrados de {emplazamientos.length} total</small>
          </div>
          <div className="d-flex gap-3 align-items-center">
            <small className="text-muted fw-bold">Leyenda:</small>
            <div className="d-flex align-items-center gap-1">
              <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: '#28a745',
                border: '2px solid white',
                borderRadius: '50%',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
              }}></div>
              <small className="text-muted"><strong className="text-success">Normal</strong> (&gt; 30 días)</small>
            </div>
            <div className="d-flex align-items-center gap-1">
              <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: '#ffc107',
                border: '2px solid white',
                borderRadius: '50%',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
              }}></div>
              <small className="text-muted"><strong className="text-warning">Advertencia</strong> (7-30 días)</small>
            </div>
            <div className="d-flex align-items-center gap-1">
              <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: '#dc3545',
                border: '2px solid white',
                borderRadius: '50%',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
              }}></div>
              <small className="text-muted"><strong className="text-danger">Crítico</strong> (&lt; 7 días)</small>
            </div>
          </div>
        </div>
      </Card.Header>

      {/* Filtros */}
      <div className="p-3 bg-light border-bottom">
        {/* Filtros Row 1 */}
        <Row className="mb-2">
          <Col md={4}>
            <InputGroup size="sm">
              <InputGroup.Text><i className="bi bi-search"></i></InputGroup.Text>
              <Form.Control
                placeholder="Buscar por nombre o ciudad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </Col>
          <Col md={2}>
            <Form.Select size="sm" value={filterCliente} onChange={(e) => setFilterCliente(e.target.value)}>
              <option value="all">Todos los clientes</option>
              {clientes.filter(c => !c.esSubcliente).map(cliente => (
                <option key={cliente._id} value={cliente._id}>{cliente.nombre}</option>
              ))}
            </Form.Select>
          </Col>
          <Col md={2}>
            <Form.Select size="sm" value={filterSubcliente} onChange={(e) => setFilterSubcliente(e.target.value)}>
              <option value="all">Todos los subclientes</option>
              {subclientes.map(subcliente => (
                <option key={subcliente._id} value={subcliente._id}>{subcliente.nombre}</option>
              ))}
            </Form.Select>
          </Col>
          <Col md={2}>
            <Form.Select size="sm" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
              <option value="all">Todos los estados</option>
              <option value="activo">Normal</option>
              <option value="inactivo">Advertencia/Crítico</option>
            </Form.Select>
          </Col>
          <Col md={2}>
            <Button
              variant="outline-secondary"
              size="sm"
              className="w-100"
              onClick={() => {
                setSearchTerm('');
                setFilterEstado('all');
                setFilterCliente('all');
                setFilterSubcliente('all');
                setFilterValorMin('');
                setFilterValorMax('');
                setFilterDepositosMin('');
                setFilterDepositosMax('');
                setFilterDiasMin('');
              }}
            >
              <i className="bi bi-x-circle me-1"></i>
              Limpiar filtros
            </Button>
          </Col>
        </Row>

        {/* Filtros Row 2 - Rangos numéricos */}
        <Row>
          <Col md={2}>
            <Form.Control
              type="number"
              size="sm"
              placeholder="Valor mín €"
              value={filterValorMin}
              onChange={(e) => setFilterValorMin(e.target.value)}
            />
          </Col>
          <Col md={2}>
            <Form.Control
              type="number"
              size="sm"
              placeholder="Valor máx €"
              value={filterValorMax}
              onChange={(e) => setFilterValorMax(e.target.value)}
            />
          </Col>
          <Col md={2}>
            <Form.Control
              type="number"
              size="sm"
              placeholder="Depósitos mín"
              value={filterDepositosMin}
              onChange={(e) => setFilterDepositosMin(e.target.value)}
            />
          </Col>
          <Col md={2}>
            <Form.Control
              type="number"
              size="sm"
              placeholder="Depósitos máx"
              value={filterDepositosMax}
              onChange={(e) => setFilterDepositosMax(e.target.value)}
            />
          </Col>
          <Col md={2}>
            <Form.Control
              type="number"
              size="sm"
              placeholder="Días mín venc."
              value={filterDiasMin}
              onChange={(e) => setFilterDiasMin(e.target.value)}
            />
          </Col>
          <Col md={2}>
            <div className="small text-muted text-center pt-1">
              <strong>{emplazamientosFiltrados.length}</strong> resultados
            </div>
          </Col>
        </Row>
      </div>

      <Card.Body className="p-0" style={{ height: '600px' }}>
        <div
          ref={mapContainerRef}
          style={{ height: '100%', width: '100%' }}
        />
      </Card.Body>
    </Card>
  );
};

export default RobustMapView;
