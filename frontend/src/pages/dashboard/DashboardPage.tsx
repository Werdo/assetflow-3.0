/**
 * AssetFlow 3.0 - Dashboard Page (BULLETPROOF VERSION)
 * Página principal con manejo de errores extensivo y debugging
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Alert, Button, ButtonGroup } from 'react-bootstrap';
import toast from 'react-hot-toast';
import { SimplifiedMapView } from '../../components/dashboard/SimplifiedMapView';
import { RobustMapView } from '../../components/dashboard/RobustMapView';
import { SimplifiedKPICards } from '../../components/dashboard/SimplifiedKPICards';
import { SimplifiedAlertas } from '../../components/dashboard/SimplifiedAlertas';
import { dashboardService } from '../../services/dashboardService';
import type { DashboardKPIsExtended as DashboardKPIs, EmplazamientoMapData, AlertaExtended as Alerta } from '../../types';

/**
 * DashboardPage - Página principal del sistema con manejo de errores bulletproof
 */
export const DashboardPage: React.FC = () => {
  console.log('[DashboardPage] Component mounted');

  // Estados
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [emplazamientos, setEmplazamientos] = useState<EmplazamientoMapData[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);

  const [loadingKPIs, setLoadingKPIs] = useState(true);
  const [loadingMap, setLoadingMap] = useState(true);
  const [loadingAlertas, setLoadingAlertas] = useState(true);

  const [errorKPIs, setErrorKPIs] = useState<string | null>(null);
  const [errorMap, setErrorMap] = useState<string | null>(null);
  const [errorAlertas, setErrorAlertas] = useState<string | null>(null);

  // Toggle entre mapa y tabla
  const [viewMode, setViewMode] = useState<'map' | 'table'>('map');

  /**
   * Carga los KPIs del dashboard con manejo de errores extensivos
   */
  const cargarKPIs = async () => {
    console.log('[DashboardPage] cargarKPIs - STARTED');
    try {
      setLoadingKPIs(true);
      setErrorKPIs(null);

      console.log('[DashboardPage] Calling dashboardService.getKPIs()...');
      const data = await dashboardService.getKPIs();
      console.log('[DashboardPage] KPIs received:', data);

      // Validate data before setting
      if (!data) {
        throw new Error('KPIs data is null or undefined');
      }

      setKpis(data);
      console.log('[DashboardPage] KPIs set successfully');
    } catch (error: any) {
      console.error('[DashboardPage] ERROR loading KPIs:', error);
      const mensaje = error?.message || 'Error desconocido al cargar KPIs';
      setErrorKPIs(mensaje);
      toast.error(`KPIs: ${mensaje}`);

      // Set empty KPIs to prevent undefined errors
      setKpis({
        valorTotalDepositado: 0,
        emplazamientosActivos: 0,
        depositosActivos: 0,
        alertasPendientes: 0,
        proximosVencer: { cantidad: 0, valorTotal: 0 },
        vencidos: { cantidad: 0, valorTotal: 0 },
        topCliente: { nombre: 'N/A', valorTotal: 0 },
        topProducto: { nombre: 'N/A', cantidadTotal: 0 }
      });
    } finally {
      setLoadingKPIs(false);
      console.log('[DashboardPage] cargarKPIs - FINISHED');
    }
  };

  /**
   * Carga los datos del mapa con manejo de errores extensivo
   */
  const cargarMapa = async () => {
    console.log('[DashboardPage] cargarMapa - STARTED');
    try {
      setLoadingMap(true);
      setErrorMap(null);

      console.log('[DashboardPage] Calling dashboardService.getMapData()...');
      const data = await dashboardService.getMapData();
      console.log('[DashboardPage] Map data received:', data);

      // Validate data
      if (!Array.isArray(data)) {
        console.warn('[DashboardPage] Map data is not an array, using empty array');
        setEmplazamientos([]);
      } else {
        setEmplazamientos(data);
      }
      console.log('[DashboardPage] Map data set successfully');
    } catch (error: any) {
      console.error('[DashboardPage] ERROR loading map:', error);
      const mensaje = error?.message || 'Error desconocido al cargar mapa';
      setErrorMap(mensaje);
      toast.error(`Mapa: ${mensaje}`);
      setEmplazamientos([]);
    } finally {
      setLoadingMap(false);
      console.log('[DashboardPage] cargarMapa - FINISHED');
    }
  };

  /**
   * Carga las alertas críticas con manejo de errores extensivo
   */
  const cargarAlertas = async () => {
    console.log('[DashboardPage] cargarAlertas - STARTED');
    try {
      setLoadingAlertas(true);
      setErrorAlertas(null);

      console.log('[DashboardPage] Calling dashboardService.getAlertasCriticas()...');
      const data = await dashboardService.getAlertasCriticas();
      console.log('[DashboardPage] Alertas received:', data);

      // Validate data
      if (!Array.isArray(data)) {
        console.warn('[DashboardPage] Alertas data is not an array, using empty array');
        setAlertas([]);
      } else {
        setAlertas(data);
      }
      console.log('[DashboardPage] Alertas set successfully');
    } catch (error: any) {
      console.error('[DashboardPage] ERROR loading alertas:', error);
      const mensaje = error?.message || 'Error desconocido al cargar alertas';
      setErrorAlertas(mensaje);
      toast.error(`Alertas: ${mensaje}`);
      setAlertas([]);
    } finally {
      setLoadingAlertas(false);
      console.log('[DashboardPage] cargarAlertas - FINISHED');
    }
  };

  /**
   * Carga todos los datos del dashboard
   */
  const cargarDashboard = async () => {
    console.log('[DashboardPage] cargarDashboard - STARTED (loading all in parallel)');
    try {
      // Cargar en paralelo para mejor performance
      await Promise.all([
        cargarKPIs(),
        cargarMapa(),
        cargarAlertas(),
      ]);
      console.log('[DashboardPage] cargarDashboard - ALL LOADED SUCCESSFULLY');
    } catch (error: any) {
      console.error('[DashboardPage] cargarDashboard - ERROR:', error);
    }
  };

  /**
   * Recarga todo el dashboard
   */
  const recargarDashboard = () => {
    console.log('[DashboardPage] recargarDashboard - TRIGGERED');
    toast.promise(
      cargarDashboard(),
      {
        loading: 'Recargando dashboard...',
        success: 'Dashboard actualizado',
        error: 'Error al recargar dashboard',
      }
    );
  };

  /**
   * Carga inicial de datos
   */
  useEffect(() => {
    console.log('[DashboardPage] useEffect - Initial load triggered');
    cargarDashboard();
  }, []);

  // Determinar si hay algún error general
  const hasError = errorKPIs || errorMap || errorAlertas;

  console.log('[DashboardPage] Render state:', {
    loadingKPIs,
    loadingMap,
    loadingAlertas,
    hasError,
    kpisNull: kpis === null,
    emplazamientosLength: emplazamientos.length,
    alertasLength: alertas.length
  });

  return (
    <Container fluid className="py-4">
      {/* Header del Dashboard */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="fw-bold mb-1">Dashboard</h2>
              <p className="text-muted mb-0">
                Vista general del sistema de control de inventario depositado
              </p>
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="outline-primary"
                onClick={recargarDashboard}
                disabled={loadingKPIs || loadingMap || loadingAlertas}
              >
                <i className="bi bi-arrow-clockwise me-2"></i>
                Actualizar
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Error General (si hay) */}
      {hasError && (
        <Row className="mb-4">
          <Col>
            <Alert variant="warning" dismissible onClose={() => {
              setErrorKPIs(null);
              setErrorMap(null);
              setErrorAlertas(null);
            }}>
              <Alert.Heading>Advertencia</Alert.Heading>
              <p>
                Algunos componentes del dashboard no se pudieron cargar correctamente.
                Intenta recargar la página o contacta con soporte si el problema persiste.
              </p>
              {errorKPIs && <div className="small mb-1"><strong>KPIs:</strong> {errorKPIs}</div>}
              {errorMap && <div className="small mb-1"><strong>Mapa:</strong> {errorMap}</div>}
              {errorAlertas && <div className="small mb-1"><strong>Alertas:</strong> {errorAlertas}</div>}
              <hr />
              <div className="mb-0">
                <Button variant="warning" size="sm" onClick={recargarDashboard}>
                  Reintentar Carga
                </Button>
              </div>
            </Alert>
          </Col>
        </Row>
      )}

      {/* Debug Info */}
      <Row className="mb-3">
        <Col>
          <div className="small text-muted bg-light p-2 rounded">
            <strong>Debug:</strong> KPIs: {loadingKPIs ? 'Loading...' : kpis ? 'Loaded' : 'Null'} |
            Map: {loadingMap ? 'Loading...' : `${emplazamientos.length} items`} |
            Alertas: {loadingAlertas ? 'Loading...' : `${alertas.length} items`}
          </div>
        </Col>
      </Row>

      {/* KPIs Cards */}
      <SimplifiedKPICards kpis={kpis} loading={loadingKPIs} error={errorKPIs} />

      {/* Mapa de Emplazamientos con Toggle */}
      <Row className="mb-4">
        <Col xs={12}>
          <div className="mb-3 d-flex justify-content-end gap-2">
            <ButtonGroup>
              <Button
                variant={viewMode === 'map' ? 'primary' : 'outline-primary'}
                onClick={() => setViewMode('map')}
                size="sm"
              >
                <i className="bi bi-map me-1"></i>
                Mapa
              </Button>
              <Button
                variant={viewMode === 'table' ? 'primary' : 'outline-primary'}
                onClick={() => setViewMode('table')}
                size="sm"
              >
                <i className="bi bi-table me-1"></i>
                Tabla
              </Button>
            </ButtonGroup>
          </div>

          {viewMode === 'map' ? (
            <RobustMapView
              emplazamientos={emplazamientos}
              loading={loadingMap}
              error={errorMap}
            />
          ) : (
            <SimplifiedMapView
              emplazamientos={emplazamientos}
              loading={loadingMap}
              error={errorMap}
            />
          )}
        </Col>
      </Row>

      {/* Tabla de Alertas Críticas */}
      <Row className="mb-4">
        <Col xs={12}>
          <SimplifiedAlertas
            alertas={alertas}
            loading={loadingAlertas}
            error={errorAlertas}
          />
        </Col>
      </Row>

      {/* Footer informativo */}
      <Row>
        <Col>
          <div className="text-center text-muted small py-3">
            <p className="mb-0">
              AssetFlow 3.0 - Sistema de Control de Inventario Depositado
              <span className="mx-2">|</span>
              Última actualización: {new Date().toLocaleString('es-ES')}
            </p>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default DashboardPage;
