/**
 * AssetFlow 3.0 - Simplified KPI Cards Component (BULLETPROOF VERSION)
 * Cards con las 8 métricas principales del dashboard con manejo de errores extensivo
 */

import React from 'react';
import { Row, Col, Card, Spinner, Alert } from 'react-bootstrap';
import type { DashboardKPIsExtended as DashboardKPIs } from '../../types';

interface SimplifiedKPICardsProps {
  kpis: DashboardKPIs | null;
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
      console.warn('[SimplifiedKPICards] Invalid number for currency:', value);
      return '€0,00';
    }
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeValue);
  } catch (error) {
    console.error('[SimplifiedKPICards] Error formatting currency:', error, value);
    return '€0,00';
  }
};

/**
 * Formatea un número con separadores de miles con manejo de errores
 */
const formatNumber = (value: number | undefined | null): string => {
  try {
    const safeValue = value ?? 0;
    if (typeof safeValue !== 'number' || isNaN(safeValue)) {
      console.warn('[SimplifiedKPICards] Invalid number:', value);
      return '0';
    }
    return new Intl.NumberFormat('es-ES').format(safeValue);
  } catch (error) {
    console.error('[SimplifiedKPICards] Error formatting number:', error, value);
    return '0';
  }
};

/**
 * Componente de Card individual para KPI con manejo de errores
 */
const KPICard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  iconColor: string;
  variant?: 'default' | 'warning' | 'danger' | 'success';
}> = ({ title, value, subtitle, icon, iconColor, variant = 'default' }) => {
  console.log('[KPICard] Rendering:', { title, value, variant });

  const borderClass =
    variant === 'warning'
      ? 'border-warning'
      : variant === 'danger'
      ? 'border-danger'
      : variant === 'success'
      ? 'border-success'
      : '';

  return (
    <Card className={`h-100 shadow-sm ${borderClass}`} style={{ borderWidth: variant !== 'default' ? '2px' : '1px' }}>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start">
          <div className="flex-grow-1">
            <p className="text-muted mb-1 small">{title}</p>
            <h4 className="mb-0 fw-bold">{value}</h4>
            {subtitle && <small className="text-muted">{subtitle}</small>}
          </div>
          <div
            className="d-flex align-items-center justify-content-center rounded-circle"
            style={{
              width: '48px',
              height: '48px',
              backgroundColor: `${iconColor}20`,
              color: iconColor,
            }}
          >
            <i className={`bi bi-${icon}`} style={{ fontSize: '1.5rem' }}></i>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

/**
 * Componente SimplifiedKPICards - Grid de 8 cards con métricas principales
 */
export const SimplifiedKPICards: React.FC<SimplifiedKPICardsProps> = ({ kpis, loading = false, error = null }) => {
  console.log('[SimplifiedKPICards] Render state:', { kpisNull: kpis === null, loading, error });

  if (loading) {
    console.log('[SimplifiedKPICards] Rendering loading state');
    return (
      <Row className="g-3 mb-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Col key={i} xs={12} sm={6} lg={3}>
            <Card className="h-100 shadow-sm">
              <Card.Body className="d-flex justify-content-center align-items-center" style={{ minHeight: '120px' }}>
                <Spinner animation="border" variant="primary" size="sm" />
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    );
  }

  if (error) {
    console.log('[SimplifiedKPICards] Rendering error state:', error);
    return (
      <Row className="g-3 mb-4">
        <Col xs={12}>
          <Alert variant="danger">
            <Alert.Heading>Error al cargar KPIs</Alert.Heading>
            <p>{error}</p>
          </Alert>
        </Col>
      </Row>
    );
  }

  if (!kpis) {
    console.log('[SimplifiedKPICards] KPIs is null, rendering placeholder');
    return (
      <Row className="g-3 mb-4">
        <Col xs={12}>
          <Alert variant="info">
            <p className="mb-0">No hay datos de KPIs disponibles</p>
          </Alert>
        </Col>
      </Row>
    );
  }

  console.log('[SimplifiedKPICards] Rendering KPIs:', kpis);

  // Safe extraction of values with fallbacks
  const valorTotalDepositado = kpis?.valorTotalDepositado ?? 0;
  const emplazamientosActivos = kpis?.emplazamientosActivos ?? 0;
  const depositosActivos = kpis?.depositosActivos ?? 0;
  const alertasPendientes = kpis?.alertasPendientes ?? 0;

  const proximosVencerCantidad = kpis?.proximosVencer?.cantidad ?? 0;
  const proximosVencerValor = kpis?.proximosVencer?.valorTotal ?? 0;

  const vencidosCantidad = kpis?.vencidos?.cantidad ?? 0;
  const vencidosValor = kpis?.vencidos?.valorTotal ?? 0;

  const topClienteNombre = kpis?.topCliente?.nombre || 'N/A';
  const topClienteValor = kpis?.topCliente?.valorTotal ?? 0;

  const topProductoNombre = kpis?.topProducto?.nombre || 'N/A';
  const topProductoCantidad = kpis?.topProducto?.cantidadTotal ?? 0;

  console.log('[SimplifiedKPICards] Safe values extracted:', {
    valorTotalDepositado,
    emplazamientosActivos,
    depositosActivos,
    alertasPendientes
  });

  return (
    <Row className="g-3 mb-4">
      {/* KPI 1: Valor Total Depositado */}
      <Col xs={12} sm={6} lg={3}>
        <KPICard
          title="Valor Total Depositado"
          value={formatCurrency(valorTotalDepositado)}
          icon="cash-stack"
          iconColor="#28a745"
          variant="success"
        />
      </Col>

      {/* KPI 2: Emplazamientos Activos */}
      <Col xs={12} sm={6} lg={3}>
        <KPICard
          title="Emplazamientos Activos"
          value={formatNumber(emplazamientosActivos)}
          icon="geo-alt-fill"
          iconColor="#0dcaf0"
        />
      </Col>

      {/* KPI 3: Depósitos Activos */}
      <Col xs={12} sm={6} lg={3}>
        <KPICard
          title="Depósitos Activos"
          value={formatNumber(depositosActivos)}
          icon="box-seam"
          iconColor="#0d6efd"
        />
      </Col>

      {/* KPI 4: Alertas Pendientes */}
      <Col xs={12} sm={6} lg={3}>
        <KPICard
          title="Alertas Pendientes"
          value={formatNumber(alertasPendientes)}
          icon="exclamation-triangle-fill"
          iconColor={alertasPendientes > 5 ? '#dc3545' : '#ffc107'}
          variant={alertasPendientes > 5 ? 'danger' : alertasPendientes > 0 ? 'warning' : 'default'}
        />
      </Col>

      {/* KPI 5: Próximos a Vencer (<7 días) */}
      <Col xs={12} sm={6} lg={3}>
        <KPICard
          title="Próximos a Vencer (<7d)"
          value={formatNumber(proximosVencerCantidad)}
          subtitle={formatCurrency(proximosVencerValor)}
          icon="clock-history"
          iconColor="#ffc107"
          variant={proximosVencerCantidad > 0 ? 'warning' : 'default'}
        />
      </Col>

      {/* KPI 6: Vencidos */}
      <Col xs={12} sm={6} lg={3}>
        <KPICard
          title="Vencidos Hoy"
          value={formatNumber(vencidosCantidad)}
          subtitle={formatCurrency(vencidosValor)}
          icon="exclamation-circle-fill"
          iconColor="#dc3545"
          variant={vencidosCantidad > 0 ? 'danger' : 'default'}
        />
      </Col>

      {/* KPI 7: Top Cliente (por valor) */}
      <Col xs={12} sm={6} lg={3}>
        <KPICard
          title="Top Cliente (Valor)"
          value={topClienteNombre}
          subtitle={topClienteValor > 0 ? formatCurrency(topClienteValor) : '-'}
          icon="building"
          iconColor="#6610f2"
        />
      </Col>

      {/* KPI 8: Top Producto (por cantidad) */}
      <Col xs={12} sm={6} lg={3}>
        <KPICard
          title="Top Producto (Cantidad)"
          value={topProductoNombre}
          subtitle={topProductoCantidad > 0 ? `${formatNumber(topProductoCantidad)} uds` : '-'}
          icon="box2-fill"
          iconColor="#fd7e14"
        />
      </Col>
    </Row>
  );
};

export default SimplifiedKPICards;
