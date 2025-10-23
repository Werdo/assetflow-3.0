/**
 * AssetFlow 3.0 - Alertas Table Component
 * Tabla de las top 10 alertas más críticas del dashboard
 */

import React from 'react';
import { Card, Table, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import type { AlertaExtended as Alerta } from '../../types';

interface AlertasTableProps {
  alertas: Alerta[];
  loading?: boolean;
  error?: string | null;
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
 * Obtiene la variante del badge según la prioridad
 */
const getPrioridadVariant = (prioridad: string): string => {
  switch (prioridad) {
    case 'critica':
      return 'danger';
    case 'alta':
      return 'warning';
    case 'media':
      return 'info';
    case 'baja':
      return 'secondary';
    default:
      return 'secondary';
  }
};

/**
 * Obtiene el icono según el tipo de alerta
 */
const getTipoIcon = (tipo: string): string => {
  switch (tipo) {
    case 'vencido':
      return 'exclamation-circle-fill';
    case 'vencimiento_3dias':
      return 'exclamation-triangle-fill';
    case 'vencimiento_7dias':
      return 'clock-history';
    case 'vencimiento_30dias':
      return 'clock';
    case 'alto_valor':
      return 'cash-stack';
    default:
      return 'bell-fill';
  }
};

/**
 * Obtiene el color de los días restantes
 */
const getDiasColor = (dias: number | undefined): string => {
  if (dias === undefined) return 'text-muted';
  if (dias < 0) return 'text-danger fw-bold';
  if (dias <= 3) return 'text-danger fw-bold';
  if (dias <= 7) return 'text-warning fw-bold';
  if (dias <= 30) return 'text-warning';
  return 'text-success';
};

/**
 * Componente AlertasTable - Top 10 alertas críticas
 */
export const AlertasTable: React.FC<AlertasTableProps> = ({ alertas, loading = false, error = null }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-white border-bottom">
          <h5 className="mb-0">Alertas Críticas</h5>
        </Card.Header>
        <Card.Body className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
          <div className="text-center">
            <Spinner animation="border" variant="danger" />
            <p className="mt-3 text-muted">Cargando alertas...</p>
          </div>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-white border-bottom">
          <h5 className="mb-0">Alertas Críticas</h5>
        </Card.Header>
        <Card.Body>
          <Alert variant="danger">
            <Alert.Heading>Error al cargar alertas</Alert.Heading>
            <p>{error}</p>
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  if (alertas.length === 0) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-white border-bottom">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Alertas Críticas</h5>
            <Badge bg="success">0 pendientes</Badge>
          </div>
        </Card.Header>
        <Card.Body className="text-center py-5">
          <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '4rem' }}></i>
          <h5 className="mt-3 text-muted">No hay alertas pendientes</h5>
          <p className="text-muted">Todos los depósitos están bajo control</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-white border-bottom">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Alertas Críticas</h5>
          <div className="d-flex gap-2 align-items-center">
            <Badge bg="danger">{alertas.length} pendientes</Badge>
            <Button variant="outline-primary" size="sm" onClick={() => navigate('/alertas')}>
              Ver Todas
            </Button>
          </div>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        <div className="table-responsive">
          <Table className="mb-0" hover>
            <thead className="table-light">
              <tr>
                <th style={{ width: '50px' }}></th>
                <th>Tipo</th>
                <th>Cliente</th>
                <th>Emplazamiento</th>
                <th className="text-end">Valor</th>
                <th className="text-center">Días Restantes</th>
                <th className="text-center">Prioridad</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {alertas.slice(0, 10).map((alerta) => (
                <tr key={alerta._id}>
                  {/* Icono según tipo */}
                  <td className="text-center align-middle">
                    <i
                      className={`bi bi-${getTipoIcon(alerta.tipo)}`}
                      style={{
                        fontSize: '1.25rem',
                        color:
                          alerta.prioridad === 'critica'
                            ? '#dc3545'
                            : alerta.prioridad === 'alta'
                            ? '#ffc107'
                            : '#6c757d',
                      }}
                    ></i>
                  </td>

                  {/* Título de la alerta */}
                  <td className="align-middle">
                    <div>
                      <strong>{alerta.titulo}</strong>
                      {alerta.descripcion && (
                        <div>
                          <small className="text-muted">{alerta.descripcion.substring(0, 50)}...</small>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Cliente */}
                  <td className="align-middle">
                    {typeof alerta.cliente === 'object' && alerta.cliente !== null
                      ? alerta.cliente.nombre
                      : 'N/A'}
                  </td>

                  {/* Emplazamiento */}
                  <td className="align-middle">
                    {typeof alerta.emplazamiento === 'object' && alerta.emplazamiento !== null
                      ? alerta.emplazamiento.nombre
                      : 'N/A'}
                  </td>

                  {/* Valor afectado */}
                  <td className="align-middle text-end">
                    <strong className="text-danger">{formatCurrency(alerta.valorAfectado ?? 0)}</strong>
                  </td>

                  {/* Días restantes */}
                  <td className="align-middle text-center">
                    {alerta.diasRestantes !== undefined ? (
                      <span className={getDiasColor(alerta.diasRestantes)}>
                        {alerta.diasRestantes < 0
                          ? `Vencido hace ${Math.abs(alerta.diasRestantes)} días`
                          : `${alerta.diasRestantes} días`}
                      </span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>

                  {/* Prioridad */}
                  <td className="align-middle text-center">
                    <Badge bg={getPrioridadVariant(alerta.prioridad)} className="text-uppercase">
                      {alerta.prioridad}
                    </Badge>
                  </td>

                  {/* Acciones */}
                  <td className="align-middle text-center">
                    <div className="d-flex gap-1 justify-content-center">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        title="Ver depósito"
                        onClick={() => navigate(`/depositos/${alerta.deposito}`)}
                      >
                        <i className="bi bi-eye"></i>
                      </Button>
                      <Button
                        variant="outline-success"
                        size="sm"
                        title="Resolver alerta"
                        onClick={() => navigate(`/alertas/${alerta._id}/resolver`)}
                      >
                        <i className="bi bi-check-circle"></i>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card.Body>
      {alertas.length > 10 && (
        <Card.Footer className="bg-light text-center">
          <small className="text-muted">
            Mostrando 10 de {alertas.length} alertas pendientes.{' '}
            <a href="/alertas" className="text-decoration-none">
              Ver todas
            </a>
          </small>
        </Card.Footer>
      )}
    </Card>
  );
};

export default AlertasTable;
