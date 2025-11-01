/**
 * AssetFlow 3.0 - IA Configuration Page
 * Panel de administración para gestionar configuraciones de IA (OpenAI, Anthropic)
 */

import React, { useState, useEffect } from 'react';
import { aiService } from '../../services/aiService';
import type { AIConfig } from '../../types';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Modal,
  Form,
  Alert,
  Spinner,
  Badge,
  InputGroup,
} from 'react-bootstrap';

/**
 * Formulario para configuración de IA
 */
interface ConfigFormData {
  proveedor: 'openai' | 'anthropic';
  nombreDisplay: string;
  apiKey: string;
  modelo: string;
  maxTokens: number;
  temperatura: number;
  limiteMensual: number;
  prioridadUso: number;
  activo: boolean;
}

const IAConfigPage: React.FC = () => {
  // Estados
  const [configs, setConfigs] = useState<AIConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal de formulario
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AIConfig | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  // Formulario
  const [formData, setFormData] = useState<ConfigFormData>({
    proveedor: 'openai',
    nombreDisplay: '',
    apiKey: '',
    modelo: '',
    maxTokens: 4000,
    temperatura: 0.7,
    limiteMensual: 100000,
    prioridadUso: 1,
    activo: true,
  });

  // Cargar configuraciones al montar
  useEffect(() => {
    loadConfigs();
  }, []);

  /**
   * Carga las configuraciones desde el backend
   */
  const loadConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await aiService.getConfigs();
      setConfigs(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar configuraciones');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Abre el modal para crear nueva configuración
   */
  const handleCreate = () => {
    setEditingConfig(null);
    setFormData({
      proveedor: 'openai',
      nombreDisplay: '',
      apiKey: '',
      modelo: '',
      maxTokens: 4000,
      temperatura: 0.7,
      limiteMensual: 100000,
      prioridadUso: 1,
      activo: true,
    });
    setShowModal(true);
  };

  /**
   * Abre el modal para editar configuración existente
   */
  const handleEdit = (config: AIConfig) => {
    setEditingConfig(config);
    setFormData({
      proveedor: config.proveedor as 'openai' | 'anthropic',
      nombreDisplay: config.nombreDisplay,
      apiKey: '', // No mostramos la API key por seguridad
      modelo: config.modelo,
      maxTokens: config.maxTokens,
      temperatura: config.temperatura,
      limiteMensual: config.limiteMensual,
      prioridadUso: config.prioridadUso,
      activo: config.activo,
    });
    setShowModal(true);
  };

  /**
   * Cierra el modal
   */
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingConfig(null);
    setShowApiKey(false);
  };

  /**
   * Maneja cambios en el formulario
   */
  const handleFormChange = (field: keyof ConfigFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Guarda la configuración (crear o actualizar)
   */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setError(null);

      // Validaciones
      if (!formData.nombreDisplay.trim()) {
        setError('El nombre es obligatorio');
        return;
      }
      if (!editingConfig && !formData.apiKey.trim()) {
        setError('La API Key es obligatoria');
        return;
      }
      if (!formData.modelo.trim()) {
        setError('El modelo es obligatorio');
        return;
      }

      if (editingConfig) {
        // Actualizar
        const updateData: any = {
          proveedor: formData.proveedor,
          nombreDisplay: formData.nombreDisplay,
          modelo: formData.modelo,
          maxTokens: formData.maxTokens,
          temperatura: formData.temperatura,
          limiteMensual: formData.limiteMensual,
          prioridadUso: formData.prioridadUso,
          activo: formData.activo,
        };

        // Solo incluir API key si se proporcionó una nueva
        if (formData.apiKey.trim()) {
          updateData.apiKey = formData.apiKey;
        }

        await aiService.updateConfig(editingConfig._id, updateData);
        setSuccess('Configuración actualizada correctamente');
      } else {
        // Crear nueva
        await aiService.createConfig(formData);
        setSuccess('Configuración creada correctamente');
      }

      handleCloseModal();
      loadConfigs();
    } catch (err: any) {
      setError(err.message || 'Error al guardar configuración');
    }
  };

  /**
   * Elimina una configuración
   */
  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta configuración?')) {
      return;
    }

    try {
      setError(null);
      await aiService.deleteConfig(id);
      setSuccess('Configuración eliminada correctamente');
      loadConfigs();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar configuración');
    }
  };

  /**
   * Obtiene el badge de proveedor con color
   */
  const getProveedorBadge = (proveedor: string) => {
    const bg = proveedor === 'openai' ? 'primary' : 'secondary';
    const label = proveedor === 'openai' ? 'OpenAI' : 'Anthropic';
    return <Badge bg={bg}>{label}</Badge>;
  };

  /**
   * Formatea la API key para mostrar solo los últimos 4 caracteres
   */
  const formatApiKey = (key: string) => {
    if (!key || key.length < 8) return '••••••••';
    return `••••••••${key.slice(-4)}`;
  };

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <i className="bi bi-gear-fill text-primary" style={{ fontSize: '2.5rem' }}></i>
              <div>
                <h2 className="mb-0 fw-bold">Configuración de IA</h2>
                <p className="text-muted mb-0">Gestiona las configuraciones de OpenAI y Anthropic</p>
              </div>
            </div>
            <Button variant="primary" onClick={handleCreate}>
              <i className="bi bi-plus-circle me-2"></i>
              Nueva Configuración
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

      {/* Tabla de configuraciones */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : configs.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-5">
            <i className="bi bi-gear text-secondary mb-3" style={{ fontSize: '4rem' }}></i>
            <h5 className="text-secondary mb-2">No hay configuraciones de IA</h5>
            <p className="text-muted mb-4">Crea tu primera configuración para comenzar a usar IA</p>
            <Button variant="primary" onClick={handleCreate}>
              <i className="bi bi-plus-circle me-2"></i>
              Crear Configuración
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Card>
          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Estado</th>
                    <th>Proveedor</th>
                    <th>Nombre</th>
                    <th>Modelo</th>
                    <th>API Key</th>
                    <th className="text-center">Tokens Máx.</th>
                    <th className="text-center">Temp.</th>
                    <th className="text-center">Límite Mensual</th>
                    <th className="text-center">Prioridad</th>
                    <th className="text-center">Uso Actual</th>
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {configs.map((config) => (
                    <tr key={config._id}>
                      <td>
                        {config.activo ? (
                          <Badge bg="success">
                            <i className="bi bi-check-circle me-1"></i>
                            Activo
                          </Badge>
                        ) : (
                          <Badge bg="secondary">
                            <i className="bi bi-x-circle me-1"></i>
                            Inactivo
                          </Badge>
                        )}
                      </td>
                      <td>{getProveedorBadge(config.proveedor)}</td>
                      <td>
                        <strong>{config.nombreDisplay}</strong>
                      </td>
                      <td>
                        <small className="text-muted">{config.modelo}</small>
                      </td>
                      <td>
                        <code style={{ fontSize: '0.85rem' }}>{formatApiKey(config.apiKeyEncrypted)}</code>
                      </td>
                      <td className="text-center">{config.maxTokens.toLocaleString()}</td>
                      <td className="text-center">{config.temperatura}</td>
                      <td className="text-center">{config.limiteMensual.toLocaleString()}</td>
                      <td className="text-center">
                        <Badge bg="info">{config.prioridadUso}</Badge>
                      </td>
                      <td className="text-center">
                        <div className="d-flex align-items-center justify-content-center gap-1">
                          <i className="bi bi-graph-up-arrow text-primary"></i>
                          <span>{config.usoMensual.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="text-end">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-2"
                          onClick={() => handleEdit(config)}
                          title="Editar"
                        >
                          <i className="bi bi-pencil"></i>
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDelete(config._id)}
                          title="Eliminar"
                        >
                          <i className="bi bi-trash"></i>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Modal de formulario */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingConfig ? 'Editar Configuración' : 'Nueva Configuración'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSave}>
          <Modal.Body>
            <Row className="g-3">
              {/* Proveedor */}
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Proveedor</Form.Label>
                  <Form.Select
                    value={formData.proveedor}
                    onChange={(e) => handleFormChange('proveedor', e.target.value)}
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              {/* Nombre Display */}
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Nombre de Configuración</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ej: OpenAI GPT-4 Principal"
                    value={formData.nombreDisplay}
                    onChange={(e) => handleFormChange('nombreDisplay', e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>

              {/* API Key */}
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>
                    {editingConfig ? 'Nueva API Key (dejar vacío para mantener)' : 'API Key'}
                  </Form.Label>
                  <InputGroup>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '0.9rem',
                        resize: 'vertical',
                        filter: showApiKey ? 'none' : 'blur(3px)'
                      }}
                      placeholder="sk-..."
                      value={formData.apiKey}
                      onChange={(e) => handleFormChange('apiKey', e.target.value)}
                      required={!editingConfig}
                    />
                    <Button
                      variant="outline-secondary"
                      onClick={() => setShowApiKey(!showApiKey)}
                      style={{ alignSelf: 'flex-start' }}
                    >
                      <i className={`bi bi-eye${showApiKey ? '-slash' : ''}`}></i>
                    </Button>
                  </InputGroup>
                </Form.Group>
              </Col>

              {/* Modelo */}
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Modelo</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder={formData.proveedor === 'openai' ? 'gpt-4' : 'claude-3-opus-20240229'}
                    value={formData.modelo}
                    onChange={(e) => handleFormChange('modelo', e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>

              {/* Max Tokens */}
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Tokens Máximos</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.maxTokens}
                    onChange={(e) => handleFormChange('maxTokens', parseInt(e.target.value))}
                    required
                  />
                </Form.Group>
              </Col>

              {/* Temperatura */}
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Temperatura</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={formData.temperatura}
                    onChange={(e) => handleFormChange('temperatura', parseFloat(e.target.value))}
                    required
                  />
                  <Form.Text className="text-muted">
                    0 = Determinístico, 2 = Creativo
                  </Form.Text>
                </Form.Group>
              </Col>

              {/* Límite Mensual */}
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Límite Mensual (tokens)</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.limiteMensual}
                    onChange={(e) => handleFormChange('limiteMensual', parseInt(e.target.value))}
                    required
                  />
                </Form.Group>
              </Col>

              {/* Prioridad */}
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Prioridad de Uso</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    max="10"
                    value={formData.prioridadUso}
                    onChange={(e) => handleFormChange('prioridadUso', parseInt(e.target.value))}
                    required
                  />
                  <Form.Text className="text-muted">
                    1 = Máxima prioridad
                  </Form.Text>
                </Form.Group>
              </Col>

              {/* Activo */}
              <Col md={6}>
                <Form.Group className="mt-4">
                  <Form.Check
                    type="switch"
                    id="activo-switch"
                    label="Configuración Activa"
                    checked={formData.activo}
                    onChange={(e) => handleFormChange('activo', e.target.checked)}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {editingConfig ? 'Actualizar' : 'Crear'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default IAConfigPage;
