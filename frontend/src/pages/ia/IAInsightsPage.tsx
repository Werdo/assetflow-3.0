/**
 * AssetFlow 3.0 - IA Insights Page
 * Panel de insights y recomendaciones automáticas - Versión Bootstrap
 */

import React, { useState, useEffect } from 'react';
import { aiService } from '../../services/aiService';
import type { AIInsight } from '../../types';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Alert,
  Spinner,
  Nav,
  Form,
  Modal,
} from 'react-bootstrap';

const IAInsightsPage: React.FC = () => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);

  // Filtros
  const [activeTab, setActiveTab] = useState<'all' | 'activo' | 'descartado' | 'aplicado'>('all');
  const [tipoFilter, setTipoFilter] = useState('');
  const [prioridadFilter, setPrioridadFilter] = useState('');

  // Modal de resolver
  const [showResolverModal, setShowResolverModal] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null);
  const [acciones, setAcciones] = useState('');

  useEffect(() => {
    loadInsights();
  }, [activeTab, tipoFilter, prioridadFilter]);

  const loadInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (activeTab !== 'all') params.estado = activeTab;
      if (tipoFilter) params.tipo = tipoFilter;
      if (prioridadFilter) params.prioridad = prioridadFilter;

      const data = await aiService.getInsights(params);
      setInsights(data.insights);
    } catch (err: any) {
      setError(err.message || 'Error al cargar insights');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerarInsights = async () => {
    try {
      setGenerando(true);
      setError(null);
      const data = await aiService.generarInsights();
      setSuccess(`Se generaron ${data.generados} insights nuevos`);
      loadInsights();
    } catch (err: any) {
      setError(err.message || 'Error al generar insights');
    } finally {
      setGenerando(false);
    }
  };

  const handleOpenResolver = (insight: AIInsight) => {
    setSelectedInsight(insight);
    setAcciones('');
    setShowResolverModal(true);
  };

  const handleResolver = async () => {
    if (!selectedInsight || !acciones.trim()) return;

    try {
      const accionesArray = acciones.split('\n').filter(a => a.trim());
      await aiService.resolverInsight(selectedInsight._id, {
        accionesTomadas: accionesArray,
      });
      setSuccess('Insight marcado como resuelto');
      setShowResolverModal(false);
      loadInsights();
    } catch (err: any) {
      setError(err.message || 'Error al resolver insight');
    }
  };

  const handleDescartar = async (id: string) => {
    if (!window.confirm('¿Deseas descartar este insight?')) return;

    try {
      await aiService.descartarInsight(id);
      setSuccess('Insight descartado');
      loadInsights();
    } catch (err: any) {
      setError(err.message || 'Error al descartar insight');
    }
  };

  const getTipoVariant = (tipo: string) => {
    switch (tipo) {
      case 'optimizacion': return 'success';
      case 'riesgo': return 'danger';
      case 'oportunidad': return 'primary';
      case 'anomalia': return 'warning';
      default: return 'info';
    }
  };

  const getPrioridadVariant = (prioridad: string) => {
    switch (prioridad) {
      case 'alta': return 'danger';
      case 'media': return 'warning';
      case 'baja': return 'info';
      default: return 'secondary';
    }
  };

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <i className="bi bi-lightbulb-fill text-warning" style={{ fontSize: '2.5rem' }}></i>
              <div>
                <h2 className="mb-0 fw-bold">Insights de IA</h2>
                <p className="text-muted mb-0">Recomendaciones y análisis automáticos</p>
              </div>
            </div>
            <Button
              variant="primary"
              onClick={handleGenerarInsights}
              disabled={generando}
            >
              {generando ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Generando...
                </>
              ) : (
                <>
                  <i className="bi bi-stars me-2"></i>
                  Generar Insights
                </>
              )}
            </Button>
          </div>
        </Col>
      </Row>

      {/* Alertas */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)} className="mb-3">
          {success}
        </Alert>
      )}

      {/* Filtros */}
      <Card className="mb-3">
        <Card.Body>
          <Row>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Tipo</Form.Label>
                <Form.Select value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value)} size="sm">
                  <option value="">Todos</option>
                  <option value="optimizacion">Optimización</option>
                  <option value="riesgo">Riesgo</option>
                  <option value="oportunidad">Oportunidad</option>
                  <option value="anomalia">Anomalía</option>
                  <option value="recomendacion">Recomendación</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Prioridad</Form.Label>
                <Form.Select value={prioridadFilter} onChange={(e) => setPrioridadFilter(e.target.value)} size="sm">
                  <option value="">Todas</option>
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Tabs */}
      <Nav variant="tabs" className="mb-3">
        <Nav.Item>
          <Nav.Link active={activeTab === 'all'} onClick={() => setActiveTab('all')}>Todos</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link active={activeTab === 'activo'} onClick={() => setActiveTab('activo')}>Activos</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link active={activeTab === 'descartado'} onClick={() => setActiveTab('descartado')}>Descartados</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link active={activeTab === 'aplicado'} onClick={() => setActiveTab('aplicado')}>Aplicados</Nav.Link>
        </Nav.Item>
      </Nav>

      {/* Lista de insights */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : insights.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-5">
            <i className="bi bi-lightbulb text-secondary mb-3" style={{ fontSize: '4rem' }}></i>
            <h5 className="text-secondary mb-2">No hay insights disponibles</h5>
            <p className="text-muted mb-4">Genera insights automáticos para obtener recomendaciones</p>
            <Button variant="primary" onClick={handleGenerarInsights}>
              <i className="bi bi-stars me-2"></i>
              Generar Insights
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Row>
          {insights.map((insight) => (
            <Col md={12} key={insight._id} className="mb-3">
              <Card className={!insight.visto ? 'border-primary' : ''}>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    <h5 className="mb-0">{insight.titulo}</h5>
                    {!insight.visto && <Badge bg="primary">Nuevo</Badge>}
                  </div>
                  <div className="d-flex gap-2">
                    <Badge bg={getTipoVariant(insight.tipo)}>{insight.tipo}</Badge>
                    <Badge bg={getPrioridadVariant(insight.prioridad)}>
                      Prioridad {insight.prioridad}
                    </Badge>
                    <Badge bg="secondary">{insight.estado}</Badge>
                  </div>
                </Card.Header>
                <Card.Body>
                  <p className="text-muted">{insight.descripcion}</p>

                  {insight.accionesRecomendadas && insight.accionesRecomendadas.length > 0 && (
                    <div className="mb-3">
                      <strong className="d-block mb-2">Acciones Recomendadas:</strong>
                      <ul>
                        {insight.accionesRecomendadas.map((accion, idx) => (
                          <li key={idx}>{accion}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {insight.datosRelacionados && (
                    <div className="bg-light p-3 rounded">
                      <strong className="d-block mb-2">Datos Adicionales:</strong>
                      <pre className="mb-0 small">{JSON.stringify(insight.datosRelacionados, null, 2)}</pre>
                    </div>
                  )}
                </Card.Body>
                {insight.estado === 'activo' && (
                  <Card.Footer className="text-end">
                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="me-2"
                      onClick={() => handleDescartar(insight._id)}
                    >
                      <i className="bi bi-x-circle me-1"></i>
                      Descartar
                    </Button>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleOpenResolver(insight)}
                    >
                      <i className="bi bi-check-circle me-1"></i>
                      Resolver
                    </Button>
                  </Card.Footer>
                )}
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Modal Resolver */}
      <Modal show={showResolverModal} onHide={() => setShowResolverModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Resolver Insight</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedInsight && (
            <>
              <h6 className="fw-bold">{selectedInsight.titulo}</h6>
              <p className="text-muted small">{selectedInsight.descripcion}</p>
              <Form.Group>
                <Form.Label>Acciones Tomadas (una por línea)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  value={acciones}
                  onChange={(e) => setAcciones(e.target.value)}
                  placeholder="Ejemplo:&#10;- Optimizamos el depósito X&#10;- Reasignamos recursos del depósito Y"
                  required
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowResolverModal(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleResolver} disabled={!acciones.trim()}>
            Marcar como Resuelto
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default IAInsightsPage;
