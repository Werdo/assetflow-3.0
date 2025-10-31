/**
 * AssetFlow 3.0 - Simplified Map View Component (BULLETPROOF VERSION)
 * Versión simplificada del mapa con manejo de errores extensivo
 * FASE 1: Comenzamos con contenido básico sin Leaflet
 */

import React from 'react';
import { Card, Spinner, Alert, Button, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import type { EmplazamientoMapData } from '../../types';

interface SimplifiedMapViewProps {
  emplazamientos: EmplazamientoMapData[];
  loading?: boolean;
  error?: string | null;
}

/**
 * Formatea un número como moneda europea con manejo de errores
 */
const formatCurrency = (value: number | undefined | null): string => {
  try {
    const safeValue = value ?? 0;
    if (typeof safeValue !== 'number' || isNaN(safeValue)) {
      return '€0,00';
    }
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeValue);
  } catch (error) {
    console.error('[SimplifiedMapView] Error formatting currency:', error);
    return '€0,00';
  }
};

/**
 * Obtiene el color del badge según el estado
 */
const getEstadoBadgeColor = (estado: string | undefined): string => {
  switch (estado) {
    case 'verde':
      return 'success';
    case 'amarillo':
      return 'warning';
    case 'rojo':
    case 'critico':
      return 'danger';
    default:
      return 'secondary';
  }
};

/**
 * Obtiene el icono según el estado
 */
const getEstadoIcon = (estado: string | undefined): string => {
  switch (estado) {
    case 'verde':
      return 'check-circle-fill';
    case 'amarillo':
      return 'exclamation-triangle-fill';
    case 'rojo':
    case 'critico':
      return 'x-circle-fill';
    default:
      return 'circle-fill';
  }
};

/**
 * Componente SimplifiedMapView - Versión simple del mapa
 * TODO: Agregar Leaflet una vez que el componente básico funcione
 */
export const SimplifiedMapView: React.FC<SimplifiedMapViewProps> = ({
  emplazamientos,
  loading = false,
  error = null
}) => {
  const navigate = useNavigate();

  console.log('[SimplifiedMapView] Render state:', {
    loading,
    error,
    emplazamientosCount: emplazamientos?.length ?? 0
  });

  if (loading) {
    console.log('[SimplifiedMapView] Rendering loading state');
    return (
      <Card className="h-100">
        <Card.Header className="bg-white border-bottom">
          <h5 className="mb-0">Mapa de Emplazamientos</h5>
        </Card.Header>
        <Card.Body className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3 text-muted">Cargando mapa...</p>
          </div>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    console.log('[SimplifiedMapView] Rendering error state:', error);
    return (
      <Card className="h-100">
        <Card.Header className="bg-white border-bottom">
          <h5 className="mb-0">Mapa de Emplazamientos</h5>
        </Card.Header>
        <Card.Body>
          <Alert variant="danger">
            <Alert.Heading>Error al cargar el mapa</Alert.Heading>
            <p>{error}</p>
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  if (!emplazamientos || emplazamientos.length === 0) {
    console.log('[SimplifiedMapView] No emplazamientos to display');
    return (
      <Card className="h-100">
        <Card.Header className="bg-white border-bottom">
          <h5 className="mb-0">Mapa de Emplazamientos</h5>
        </Card.Header>
        <Card.Body className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
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

  console.log('[SimplifiedMapView] Rendering', emplazamientos.length, 'emplazamientos');

  return (
    <Card className="h-100">
      <Card.Header className="bg-white border-bottom">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Vista de Emplazamientos ({emplazamientos.length})</h5>
          <div className="d-flex gap-3">
            <div className="d-flex align-items-center gap-1">
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: '#28a745',
                  borderRadius: '50%',
                  display: 'inline-block',
                }}
              ></span>
              <small className="text-muted">Normal</small>
            </div>
            <div className="d-flex align-items-center gap-1">
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: '#ffc107',
                  borderRadius: '50%',
                  display: 'inline-block',
                }}
              ></span>
              <small className="text-muted">Advertencia</small>
            </div>
            <div className="d-flex align-items-center gap-1">
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: '#dc3545',
                  borderRadius: '50%',
                  display: 'inline-block',
                }}
              ></span>
              <small className="text-muted">Crítico</small>
            </div>
          </div>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        <div className="alert alert-info m-3">
          <i className="bi bi-info-circle me-2"></i>
          <strong>Mapa simplificado:</strong> Por ahora mostramos una lista. El mapa interactivo se activará una vez verificado que todo funciona correctamente.
        </div>
        <div className="table-responsive">
          <Table hover className="mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>Emplazamiento</th>
                <th>Cliente</th>
                <th>Ubicación</th>
                <th className="text-center">Depósitos</th>
                <th className="text-end">Valor Total</th>
                <th className="text-center">Días Min.</th>
                <th className="text-center">Estado</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {emplazamientos.map((emp) => {
                const safeEmp = {
                  _id: emp?._id || 'unknown',
                  nombre: emp?.nombre || 'Sin nombre',
                  cliente: emp?.cliente?.nombre || 'Sin cliente',
                  ciudad: emp?.ciudad || '',
                  provincia: emp?.provincia || '',
                  depositosActivos: emp?.depositosActivos ?? 0,
                  valorTotal: emp?.valorTotal ?? 0,
                  diasMinimosRestantes: emp?.diasMinimosRestantes,
                  estado: emp?.estado || 'verde',
                  coordenadas: emp?.coordenadas || { lat: 0, lng: 0 }
                };

                console.log('[SimplifiedMapView] Rendering emplazamiento:', safeEmp._id);

                return (
                  <tr key={safeEmp._id}>
                    <td className="text-center align-middle">
                      <i
                        className={`bi bi-${getEstadoIcon(safeEmp.estado)}`}
                        style={{
                          fontSize: '1.25rem',
                          color: safeEmp.estado === 'verde' ? '#28a745' :
                                 safeEmp.estado === 'amarillo' ? '#ffc107' : '#dc3545'
                        }}
                      ></i>
                    </td>
                    <td className="align-middle">
                      <strong>{safeEmp.nombre}</strong>
                    </td>
                    <td className="align-middle">
                      {(emp as any)?.subcliente ? (
                        <div>
                          <div><strong>{(emp as any).subcliente.clientePrincipal?.nombre || safeEmp.cliente}</strong></div>
                          <small className="text-muted">└ {(emp as any).subcliente.nombre}</small>
                        </div>
                      ) : (
                        safeEmp.cliente
                      )}
                    </td>
                    <td className="align-middle">
                      {safeEmp.ciudad}
                      {safeEmp.provincia && `, ${safeEmp.provincia}`}
                    </td>
                    <td className="text-center align-middle">
                      <span className="badge bg-primary">{safeEmp.depositosActivos}</span>
                    </td>
                    <td className="text-end align-middle">
                      <strong className="text-success">{formatCurrency(safeEmp.valorTotal)}</strong>
                    </td>
                    <td className="text-center align-middle">
                      {safeEmp.diasMinimosRestantes !== undefined ? (
                        <span
                          className={
                            safeEmp.diasMinimosRestantes < 7 ? 'text-danger fw-bold' :
                            safeEmp.diasMinimosRestantes < 30 ? 'text-warning fw-bold' :
                            'text-success'
                          }
                        >
                          {safeEmp.diasMinimosRestantes} días
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="text-center align-middle">
                      <span className={`badge bg-${getEstadoBadgeColor(safeEmp.estado)}`}>
                        {safeEmp.estado}
                      </span>
                    </td>
                    <td className="text-center align-middle">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => navigate(`/emplazamientos/${safeEmp._id}`)}
                      >
                        <i className="bi bi-eye"></i>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      </Card.Body>
      <Card.Footer className="bg-light text-muted small">
        <div className="d-flex justify-content-between align-items-center">
          <span>Total: {emplazamientos.length} emplazamientos</span>
          <Button
            variant="link"
            size="sm"
            onClick={() => navigate('/emplazamientos')}
          >
            Ver todos los emplazamientos
          </Button>
        </div>
      </Card.Footer>
    </Card>
  );
};

export default SimplifiedMapView;
