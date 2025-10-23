/**
 * AssetFlow 3.0 - KPI Cards Component
 * Cards con las 8 métricas principales del dashboard
 */

import React from 'react';
import { Row, Col, Card, Spinner } from 'react-bootstrap';
import type { DashboardKPIsExtended as DashboardKPIs } from '../../types';

interface KPICardsProps {
  kpis: DashboardKPIs | null;
  loading?: boolean;
}

/**
 * Formatea un número como moneda europea
 */
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Formatea un número con separadores de miles
 */
const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('es-ES').format(value);
};

/**
 * Componente de Card individual para KPI
 */
const KPICard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  iconColor: string;
  variant?: 'default' | 'warning' | 'danger' | 'success';
}> = ({ title, value, subtitle, icon, iconColor, variant = 'default' }) => {
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
            className={`d-flex align-items-center justify-content-center rounded-circle`}
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
 * Componente KPICards - Grid de 8 cards con métricas principales
 */
export const KPICards: React.FC<KPICardsProps> = ({ kpis, loading = false }) => {
  if (loading) {
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

  if (!kpis) {
    return null;
  }

  return (
    <Row className="g-3 mb-4">
      {/* KPI 1: Valor Total Depositado */}
      <Col xs={12} sm={6} lg={3}>
        <KPICard
          title="Valor Total Depositado"
          value={formatCurrency(kpis.valorTotalDepositado ?? 0)}
          icon="cash-stack"
          iconColor="#28a745"
          variant="success"
        />
      </Col>

      {/* KPI 2: Emplazamientos Activos */}
      <Col xs={12} sm={6} lg={3}>
        <KPICard
          title="Emplazamientos Activos"
          value={formatNumber(kpis.emplazamientosActivos ?? 0)}
          icon="geo-alt-fill"
          iconColor="#0dcaf0"
        />
      </Col>

      {/* KPI 3: Depósitos Activos */}
      <Col xs={12} sm={6} lg={3}>
        <KPICard
          title="Depósitos Activos"
          value={formatNumber(kpis.depositosActivos ?? 0)}
          icon="box-seam"
          iconColor="#0d6efd"
        />
      </Col>

      {/* KPI 4: Alertas Pendientes */}
      <Col xs={12} sm={6} lg={3}>
        <KPICard
          title="Alertas Pendientes"
          value={formatNumber(kpis.alertasPendientes ?? 0)}
          icon="exclamation-triangle-fill"
          iconColor={(kpis.alertasPendientes ?? 0) > 5 ? '#dc3545' : '#ffc107'}
          variant={(kpis.alertasPendientes ?? 0) > 5 ? 'danger' : (kpis.alertasPendientes ?? 0) > 0 ? 'warning' : 'default'}
        />
      </Col>

      {/* KPI 5: Próximos a Vencer (<7 días) */}
      <Col xs={12} sm={6} lg={3}>
        <KPICard
          title="Próximos a Vencer (<7d)"
          value={formatNumber(kpis.proximosVencer?.cantidad ?? 0)}
          subtitle={formatCurrency(kpis.proximosVencer?.valorTotal ?? 0)}
          icon="clock-history"
          iconColor="#ffc107"
          variant={(kpis.proximosVencer?.cantidad ?? 0) > 0 ? 'warning' : 'default'}
        />
      </Col>

      {/* KPI 6: Vencidos */}
      <Col xs={12} sm={6} lg={3}>
        <KPICard
          title="Vencidos Hoy"
          value={formatNumber(kpis.vencidos?.cantidad ?? 0)}
          subtitle={formatCurrency(kpis.vencidos?.valorTotal ?? 0)}
          icon="exclamation-circle-fill"
          iconColor="#dc3545"
          variant={(kpis.vencidos?.cantidad ?? 0) > 0 ? 'danger' : 'default'}
        />
      </Col>

      {/* KPI 7: Top Cliente (por valor) */}
      <Col xs={12} sm={6} lg={3}>
        <KPICard
          title="Top Cliente (Valor)"
          value={kpis.topCliente.nombre || 'N/A'}
          subtitle={kpis.topCliente.valorTotal ? formatCurrency(kpis.topCliente.valorTotal) : '-'}
          icon="building"
          iconColor="#6610f2"
        />
      </Col>

      {/* KPI 8: Top Producto (por cantidad) */}
      <Col xs={12} sm={6} lg={3}>
        <KPICard
          title="Top Producto (Cantidad)"
          value={kpis.topProducto.nombre || 'N/A'}
          subtitle={
            kpis.topProducto.cantidadTotal
              ? `${formatNumber(kpis.topProducto.cantidadTotal)} uds`
              : '-'
          }
          icon="box2-fill"
          iconColor="#fd7e14"
        />
      </Col>
    </Row>
  );
};

export default KPICards;
