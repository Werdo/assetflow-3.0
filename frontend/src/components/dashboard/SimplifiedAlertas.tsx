/**
 * AssetFlow 3.0 - Simplified Alertas Component (BULLETPROOF VERSION)
 * Tabla de alertas críticas con manejo de errores extensivo
 */

import React from 'react';
import { Card, Table, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import type { AlertaExtended as Alerta } from '../../types';

interface SimplifiedAlertasProps {
  alertas: Alerta[];
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
    console.error('[SimplifiedAlertas] Error formatting currency:', error);
    return '€0,00';
  }
};

/**
 * Obtiene la variante del badge según la prioridad con manejo seguro
 */
const getPrioridadVariant = (prioridad: string | undefined): string => {
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
 * Obtiene el icono según el tipo de alerta con manejo seguro
 */
const getTipoIcon = (tipo: string | undefined): string => {
  switch (tipo) {
    case 'vencido':
      return 'exclamation-circle-fill';
    case 'vencimiento_proximo':
    case 'vencimiento_3dias':
      return 'exclamation-triangle-fill';
    case 'vencimiento_7dias':
      return 'clock-history';
    case 'vencimiento_30dias':
      return 'clock';
    case 'alto_valor':
    case 'valor_alto':
      return 'cash-stack';
    case 'stock_bajo':
      return 'box-seam';
    default:
      return 'bell-fill';
  }
};

/**
 * Obtiene el color de los días restantes con manejo seguro
 */
const getDiasColor = (dias: number | undefined | null): string => {
  if (dias === undefined || dias === null) return 'text-muted';
  if (dias < 0) return 'text-danger fw-bold';
  if (dias <= 3) return 'text-danger fw-bold';
  if (dias <= 7) return 'text-warning fw-bold';
  if (dias <= 30) return 'text-warning';
  return 'text-success';
};

/**
 * Formatea el texto de días restantes con manejo seguro
 */
const formatDiasRestantes = (dias: number | undefined | null): string => {
  if (dias === undefined || dias === null) return '-';
  if (dias < 0) return `Vencido hace ${Math.abs(dias)} días`;
  return `${dias} días`;
};

/**
 * Componente SimplifiedAlertas - Tabla de alertas críticas
 */
export const SimplifiedAlertas: React.FC<SimplifiedAlertasProps> = ({
  alertas,
  loading = false,
  error = null
}) => {
  const navigate = useNavigate();

  console.log('[SimplifiedAlertas] Render state:', {
    loading,
    error,
    alertasCount: alertas?.length ?? 0
  });

  if (loading) {
    console.log('[SimplifiedAlertas] Rendering loading state');
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
    console.log('[SimplifiedAlertas] Rendering error state:', error);
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

  if (!alertas || alertas.length === 0) {
    console.log('[SimplifiedAlertas] No alertas to display');
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

  console.log('[SimplifiedAlertas] Rendering', alertas.length, 'alertas');

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
              {alertas.slice(0, 10).map((alerta) => {
                // Safe extraction with fallbacks
                const safeAlerta = {
                  _id: alerta?._id || 'unknown',
                  tipo: alerta?.tipo || 'otro',
                  titulo: alerta?.titulo || 'Sin título',
                  descripcion: alerta?.descripcion || '',
                  prioridad: alerta?.prioridad || 'media',
                  valorAfectado: alerta?.valorAfectado ?? 0,
                  diasRestantes: alerta?.diasRestantes,
                  deposito: typeof alerta?.deposito === 'string' ? alerta.deposito : (alerta?.deposito as any)?._id || '',
                  clienteNombre: alerta?.cliente?.nombre || 'N/A',
                  emplazamientoNombre: alerta?.emplazamiento?.nombre || 'N/A'
                };

                console.log('[SimplifiedAlertas] Rendering alerta:', safeAlerta._id);

                return (
                  <tr key={safeAlerta._id}>
                    {/* Icono según tipo */}
                    <td className="text-center align-middle">
                      <i
                        className={`bi bi-${getTipoIcon(safeAlerta.tipo)}`}
                        style={{
                          fontSize: '1.25rem',
                          color:
                            safeAlerta.prioridad === 'critica'
                              ? '#dc3545'
                              : safeAlerta.prioridad === 'alta'
                              ? '#ffc107'
                              : '#6c757d',
                        }}
                      ></i>
                    </td>

                    {/* Título de la alerta */}
                    <td className="align-middle">
                      <div>
                        <strong>{safeAlerta.titulo}</strong>
                        {safeAlerta.descripcion && (
                          <div>
                            <small className="text-muted">
                              {safeAlerta.descripcion.length > 50
                                ? `${safeAlerta.descripcion.substring(0, 50)}...`
                                : safeAlerta.descripcion}
                            </small>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Cliente */}
                    <td className="align-middle">{safeAlerta.clienteNombre}</td>

                    {/* Emplazamiento */}
                    <td className="align-middle">{safeAlerta.emplazamientoNombre}</td>

                    {/* Valor afectado */}
                    <td className="align-middle text-end">
                      <strong className="text-danger">{formatCurrency(safeAlerta.valorAfectado)}</strong>
                    </td>

                    {/* Días restantes */}
                    <td className="align-middle text-center">
                      <span className={getDiasColor(safeAlerta.diasRestantes)}>
                        {formatDiasRestantes(safeAlerta.diasRestantes)}
                      </span>
                    </td>

                    {/* Prioridad */}
                    <td className="align-middle text-center">
                      <Badge bg={getPrioridadVariant(safeAlerta.prioridad)} className="text-uppercase">
                        {safeAlerta.prioridad}
                      </Badge>
                    </td>

                    {/* Acciones */}
                    <td className="align-middle text-center">
                      <div className="d-flex gap-1 justify-content-center">
                        {safeAlerta.deposito && (
                          <Button
                            variant="outline-primary"
                            size="sm"
                            title="Ver depósito"
                            onClick={() => {
                              try {
                                navigate(`/depositos/${safeAlerta.deposito}`);
                              } catch (error) {
                                console.error('[SimplifiedAlertas] Error navigating to deposito:', error);
                              }
                            }}
                          >
                            <i className="bi bi-eye"></i>
                          </Button>
                        )}
                        <Button
                          variant="outline-success"
                          size="sm"
                          title="Ver alerta"
                          onClick={() => {
                            try {
                              navigate(`/alertas`);
                            } catch (error) {
                              console.error('[SimplifiedAlertas] Error navigating to alertas:', error);
                            }
                          }}
                        >
                          <i className="bi bi-check-circle"></i>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      </Card.Body>
      {alertas.length > 10 && (
        <Card.Footer className="bg-light text-center">
          <small className="text-muted">
            Mostrando 10 de {alertas.length} alertas pendientes.{' '}
            <Button
              variant="link"
              size="sm"
              className="p-0 text-decoration-none"
              onClick={() => navigate('/alertas')}
            >
              Ver todas
            </Button>
          </small>
        </Card.Footer>
      )}
    </Card>
  );
};

export default SimplifiedAlertas;
