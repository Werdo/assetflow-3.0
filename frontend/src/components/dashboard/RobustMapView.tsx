/**
 * AssetFlow 3.0 - Robust Map View Component
 * Mapa con Leaflet + OpenStreetMap con manejo robusto de errores
 */

import React, { useEffect, useState, useRef } from 'react';
import { Card, Spinner, Alert, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import type { EmplazamientoMapData } from '../../types';

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

  // Inicializar mapa cuando Leaflet esté cargado
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || emplazamientos.length === 0) {
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
        const map = L.map(mapContainerRef.current, {
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

        console.log(`[RobustMapView] Añadiendo ${emplazamientos.length} emplazamientos al mapa`);

        emplazamientos.forEach((emp, index) => {
          if (!emp.coordenadas || !emp.coordenadas.lat || !emp.coordenadas.lng) {
            console.warn('[RobustMapView] Emplazamiento sin coordenadas:', emp._id);
            return;
          }

          const lat = emp.coordenadas.lat;
          const lng = emp.coordenadas.lng;
          bounds.push([lat, lng]);

          // Determinar color según estado con todos los casos posibles
          let color = '#28a745'; // Verde por defecto
          let iconText = '•';

          const estado = emp.estado?.toLowerCase() || 'verde';

          if (estado === 'critico' || estado === 'rojo' || estado === 'vencido') {
            color = '#dc3545'; // Rojo
            iconText = '!';
          } else if (estado === 'proximo_vencimiento' || estado === 'amarillo' || estado === 'advertencia') {
            color = '#ffc107'; // Amarillo
            iconText = '⚠';
          } else if (estado === 'verde' || estado === 'normal' || estado === 'ok') {
            color = '#28a745'; // Verde
            iconText = '✓';
          }

          // Crear icono personalizado tipo pin con SVG
          const icon = L.divIcon({
            className: 'custom-marker-icon',
            html: `
              <div style="position: relative; width: 36px; height: 46px;">
                <svg width="36" height="46" viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg">
                  <!-- Sombra -->
                  <ellipse cx="18" cy="44" rx="8" ry="2" fill="rgba(0,0,0,0.2)" />

                  <!-- Pin principal -->
                  <path d="M18 0C10.268 0 4 6.268 4 14c0 10.5 14 30 14 30s14-19.5 14-30c0-7.732-6.268-14-14-14z"
                        fill="${color}"
                        stroke="white"
                        stroke-width="2"/>

                  <!-- Círculo interior blanco -->
                  <circle cx="18" cy="14" r="7" fill="white"/>

                  <!-- Texto/símbolo -->
                  <text x="18" y="19"
                        text-anchor="middle"
                        font-size="16"
                        font-weight="bold"
                        fill="${color}">${iconText}</text>
                </svg>
              </div>
            `,
            iconSize: [36, 46],
            iconAnchor: [18, 46],
            popupAnchor: [0, -46],
          });

          // Crear marcador
          const marker = L.marker([lat, lng], { icon });

          console.log(`[RobustMapView] Marcador ${index + 1}/${emplazamientos.length}: ${emp.nombre} (${estado}) at [${lat}, ${lng}]`);

          // Crear popup
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
          marker.addTo(map);
        });

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
  }, [leafletLoaded, emplazamientos]);

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
            <small className="text-muted">{emplazamientos.length} emplazamientos activos</small>
          </div>
          <div className="d-flex gap-3 align-items-center">
            <small className="text-muted fw-bold">Leyenda:</small>
            <div className="d-flex align-items-center gap-1">
              <svg width="16" height="20" viewBox="0 0 36 46">
                <path d="M18 0C10.268 0 4 6.268 4 14c0 10.5 14 30 14 30s14-19.5 14-30c0-7.732-6.268-14-14-14z"
                      fill="#28a745" stroke="white" stroke-width="2"/>
                <circle cx="18" cy="14" r="7" fill="white"/>
              </svg>
              <small className="text-muted"><strong className="text-success">Normal</strong> (&gt; 30 días)</small>
            </div>
            <div className="d-flex align-items-center gap-1">
              <svg width="16" height="20" viewBox="0 0 36 46">
                <path d="M18 0C10.268 0 4 6.268 4 14c0 10.5 14 30 14 30s14-19.5 14-30c0-7.732-6.268-14-14-14z"
                      fill="#ffc107" stroke="white" stroke-width="2"/>
                <circle cx="18" cy="14" r="7" fill="white"/>
              </svg>
              <small className="text-muted"><strong className="text-warning">Advertencia</strong> (7-30 días)</small>
            </div>
            <div className="d-flex align-items-center gap-1">
              <svg width="16" height="20" viewBox="0 0 36 46">
                <path d="M18 0C10.268 0 4 6.268 4 14c0 10.5 14 30 14 30s14-19.5 14-30c0-7.732-6.268-14-14-14z"
                      fill="#dc3545" stroke="white" stroke-width="2"/>
                <circle cx="18" cy="14" r="7" fill="white"/>
              </svg>
              <small className="text-muted"><strong className="text-danger">Crítico</strong> (&lt; 7 días)</small>
            </div>
          </div>
        </div>
      </Card.Header>
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
