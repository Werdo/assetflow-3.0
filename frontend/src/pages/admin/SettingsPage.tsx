/**
 * AssetFlow 3.0 - Admin Settings Page
 * System configuration and settings
 */

import React from 'react';
import { Container, Row, Col, Card, Alert } from 'react-bootstrap';

export const SettingsPage: React.FC = () => {
  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div>
            <h2 className="fw-bold mb-1">Configuración del Sistema</h2>
            <p className="text-muted mb-0">Ajustes y configuraciones generales</p>
          </div>
        </Col>
      </Row>

      {/* Settings Content */}
      <Row>
        <Col>
          <Card className="shadow-sm">
            <Card.Body>
              <Alert variant="info">
                <i className="bi bi-info-circle-fill me-2"></i>
                La página de configuración estará disponible próximamente.
              </Alert>

              <div className="py-4">
                <h5 className="mb-3">Características Planificadas:</h5>
                <ul className="list-unstyled">
                  <li className="mb-2">
                    <i className="bi bi-check-circle text-success me-2"></i>
                    Configuración de notificaciones por email
                  </li>
                  <li className="mb-2">
                    <i className="bi bi-check-circle text-success me-2"></i>
                    Configuración de umbrales de alertas
                  </li>
                  <li className="mb-2">
                    <i className="bi bi-check-circle text-success me-2"></i>
                    Configuración de copias de seguridad
                  </li>
                  <li className="mb-2">
                    <i className="bi bi-check-circle text-success me-2"></i>
                    Configuración de integraciones
                  </li>
                  <li className="mb-2">
                    <i className="bi bi-check-circle text-success me-2"></i>
                    Logs de auditoría
                  </li>
                </ul>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default SettingsPage;
