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

        console.log(`[RobustMapView] Añadiendo ${emplazamientos.length} emplazamientos al mapa`);

        emplazamientos.forEach((emp, index) => {
          if (!emp.coordenadas || !emp.coordenadas.lat || !emp.coordenadas.lng) {
            console.warn('[RobustMapView] Emplazamiento sin coordenadas:', emp._id, emp.nombre);
            return;
          }

          const lat = emp.coordenadas.lat;
          const lng = emp.coordenadas.lng;

          console.log(`[RobustMapView] Procesando marcador ${index + 1}/${emplazamientos.length}:`, {
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
