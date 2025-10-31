/**
 * AssetFlow 3.0 - Map View Component
 * Mapa interactivo con Leaflet + OpenStreetMap
 * Muestra emplazamientos con pins coloreados según estado
 */

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Icon, LatLngExpression } from 'leaflet';
import { Card, Spinner, Alert, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import type { EmplazamientoMapData } from '../../types';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
  emplazamientos: EmplazamientoMapData[];
  loading?: boolean;
  error?: string | null;
}

/**
 * Componente para ajustar el mapa a los bounds de los marcadores
 */
const FitBounds: React.FC<{ emplazamientos: EmplazamientoMapData[] }> = ({ emplazamientos }) => {
  const map = useMap();

  useEffect(() => {
    if (emplazamientos.length > 0) {
      const bounds: LatLngExpression[] = emplazamientos.map((emp) => [
        emp.coordenadas.lat,
        emp.coordenadas.lng,
      ]);
      map.fitBounds(bounds as any, { padding: [50, 50] });
    }
  }, [emplazamientos, map]);

  return null;
};

/**
 * Genera un icono personalizado según el estado del emplazamiento
 */
const createCustomIcon = (estado: string, depositosActivos: number): Icon => {
  let color = '#28a745'; // Verde por defecto

  if (estado === 'critico' || estado === 'vencido') {
    color = '#dc3545'; // Rojo
  } else if (estado === 'proximo_vencimiento' || estado === 'amarillo') {
    color = '#ffc107'; // Amarillo
  }

  // Tamaño del pin según cantidad de depósitos
  const size = depositosActivos > 10 ? 40 : depositosActivos > 5 ? 35 : 30;

  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="${size}" height="${size * 1.5}">
        <path fill="${color}" stroke="#fff" stroke-width="2" d="M12 0C7.5 0 3.75 3.75 3.75 8.25c0 5.25 8.25 17.25 8.25 17.25s8.25-12 8.25-17.25C20.25 3.75 16.5 0 12 0z"/>
        <circle fill="#fff" cx="12" cy="8.25" r="3"/>
      </svg>
    `)}`,
    iconSize: [size, size * 1.5],
    iconAnchor: [size / 2, size * 1.5],
    popupAnchor: [0, -size * 1.5],
  });
};

/**
 * Componente MapView - Mapa interactivo del dashboard
 */
export const MapView: React.FC<MapViewProps> = ({ emplazamientos, loading = false, error = null }) => {
  const navigate = useNavigate();
  const [mapReady, setMapReady] = useState(false);

  // Centro del mapa por defecto (España)
  const defaultCenter: LatLngExpression = [40.4168, -3.7038]; // Madrid
  const defaultZoom = 6;

  useEffect(() => {
    setMapReady(true);
  }, []);

  if (loading) {
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

  if (error) {
    return (
      <Card className="h-100">
        <Card.Body>
          <Alert variant="danger">
            <Alert.Heading>Error al cargar el mapa</Alert.Heading>
            <p>{error}</p>
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
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Mapa de Emplazamientos</h5>
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
              <small className="text-muted">&gt; 30 días</small>
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
              <small className="text-muted">7-30 días</small>
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
              <small className="text-muted">&lt; 7 días</small>
            </div>
          </div>
        </div>
      </Card.Header>
      <Card.Body className="p-0" style={{ height: '600px' }}>
        {mapReady && (
          <MapContainer
            center={defaultCenter}
            zoom={defaultZoom}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MarkerClusterGroup chunkedLoading>
              {emplazamientos.map((emp) => (
                <Marker
                  key={emp._id}
                  position={[emp.coordenadas.lat, emp.coordenadas.lng]}
                  icon={createCustomIcon(emp.estado, emp.depositosActivos)}
                >
                  <Popup>
                    <div style={{ minWidth: '250px' }}>
                      <h6 className="fw-bold mb-2">{emp.nombre}</h6>
                      <hr className="my-2" />
                      <div className="mb-2">
                        <small className="text-muted d-block">Cliente</small>
                        {(emp as any).subcliente ? (
                          <div>
                            <strong>{(emp as any).subcliente.clientePrincipal?.nombre || emp.cliente.nombre}</strong>
                            <div className="small text-muted">└ {(emp as any).subcliente.nombre}</div>
                          </div>
                        ) : (
                          <strong>{emp.cliente.nombre}</strong>
                        )}
                      </div>
                      <div className="mb-2">
                        <small className="text-muted d-block">Ubicación</small>
                        <span>
                          {emp.ciudad}
                          {emp.provincia && `, ${emp.provincia}`}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <div>
                          <small className="text-muted d-block">Depósitos</small>
                          <strong className="text-primary">{emp.depositosActivos}</strong>
                        </div>
                        <div>
                          <small className="text-muted d-block">Valor Total</small>
                          <strong className="text-success">
                            €{(emp.valorTotal || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </strong>
                        </div>
                      </div>
                      {emp.diasMinimosRestantes !== undefined && (
                        <div className="mb-2">
                          <small className="text-muted d-block">Días mínimos restantes</small>
                          <strong
                            className={
                              emp.diasMinimosRestantes < 7
                                ? 'text-danger'
                                : emp.diasMinimosRestantes < 30
                                ? 'text-warning'
                                : 'text-success'
                            }
                          >
                            {emp.diasMinimosRestantes} días
                          </strong>
                        </div>
                      )}
                      <hr className="my-2" />
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-100"
                        onClick={() => navigate(`/emplazamientos/${emp._id}`)}
                      >
                        Ver Detalle
                      </Button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MarkerClusterGroup>

            <FitBounds emplazamientos={emplazamientos} />
          </MapContainer>
        )}
      </Card.Body>
    </Card>
  );
};

export default MapView;
