/**
 * AssetFlow 3.0 - Admin Dashboard Page
 * Overview of admin panel with quick access to main functions
 */

import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const adminModules = [
    {
      title: 'Gestión de Usuarios',
      description: 'Crear, editar y eliminar usuarios del sistema',
      icon: 'people-fill',
      color: 'primary',
      path: '/admin/users',
    },
    {
      title: 'Estado del Sistema',
      description: 'Monitorear el estado de salud y rendimiento del sistema',
      icon: 'server',
      color: 'success',
      path: '/admin/system',
    },
    {
      title: 'Configuración',
      description: 'Ajustes y configuraciones del sistema',
      icon: 'gear-fill',
      color: 'warning',
      path: '/admin/settings',
    },
    {
      title: 'Volver al Dashboard',
      description: 'Regresar al dashboard principal',
      icon: 'house-door',
      color: 'info',
      path: '/dashboard',
    },
  ];

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="text-center">
            <h1 className="fw-bold mb-2">
              <i className="bi bi-shield-lock-fill text-warning me-3"></i>
              Panel de Administración
            </h1>
            <p className="text-muted fs-5">
              Gestiona usuarios, monitorea el sistema y configura ajustes
            </p>
          </div>
        </Col>
      </Row>

      {/* Admin Modules Grid */}
      <Row className="g-4">
        {adminModules.map((module, index) => (
          <Col key={index} md={6} lg={3}>
            <Card
              className="h-100 shadow-sm border-0"
              style={{
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onClick={() => navigate(module.path)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
              }}
            >
              <Card.Body className="text-center p-4">
                <div
                  className={`bg-${module.color} bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3`}
                  style={{ width: '80px', height: '80px' }}
                >
                  <i className={`bi bi-${module.icon} text-${module.color}`} style={{ fontSize: '2.5rem' }}></i>
                </div>
                <h5 className="fw-bold mb-2">{module.title}</h5>
                <p className="text-muted mb-3">{module.description}</p>
                <Button variant={module.color} size="sm">
                  Acceder
                  <i className="bi bi-arrow-right ms-2"></i>
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Info Cards */}
      <Row className="mt-5">
        <Col md={4}>
          <Card className="border-0 bg-light">
            <Card.Body>
              <h6 className="fw-bold mb-2">
                <i className="bi bi-info-circle-fill text-primary me-2"></i>
                Información
              </h6>
              <p className="small text-muted mb-0">
                Este panel de administración te permite gestionar todos los aspectos del sistema AssetFlow.
              </p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 bg-light">
            <Card.Body>
              <h6 className="fw-bold mb-2">
                <i className="bi bi-shield-check text-success me-2"></i>
                Seguridad
              </h6>
              <p className="small text-muted mb-0">
                Solo los usuarios con rol de administrador tienen acceso a este panel.
              </p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 bg-light">
            <Card.Body>
              <h6 className="fw-bold mb-2">
                <i className="bi bi-lightning-fill text-warning me-2"></i>
                Rendimiento
              </h6>
              <p className="small text-muted mb-0">
                Monitorea el estado del sistema en tiempo real desde la sección de Estado del Sistema.
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminDashboardPage;
