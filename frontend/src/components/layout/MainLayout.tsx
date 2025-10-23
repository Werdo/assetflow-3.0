/**
 * AssetFlow 3.0 - Main Layout Component
 * Layout principal con Navbar para todas las páginas protegidas
 */

import { ReactNode } from 'react';
import { Container, Navbar, Nav, NavDropdown } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-vh-100 d-flex flex-column">
      {/* Navbar */}
      <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm">
        <Container fluid>
          <Navbar.Brand as={Link} to="/dashboard" className="fw-bold">
            <i className="bi bi-box-seam me-2"></i>
            AssetFlow 3.0
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="main-navbar" />
          <Navbar.Collapse id="main-navbar">
            <Nav className="me-auto">
              <Nav.Link
                as={Link}
                to="/dashboard"
                active={isActive('/dashboard')}
              >
                <i className="bi bi-speedometer2 me-1"></i>
                Dashboard
              </Nav.Link>
              <Nav.Link
                as={Link}
                to="/productos"
                active={isActive('/productos')}
              >
                <i className="bi bi-box me-1"></i>
                Productos
              </Nav.Link>
              <Nav.Link
                as={Link}
                to="/clientes"
                active={isActive('/clientes')}
              >
                <i className="bi bi-people me-1"></i>
                Clientes
              </Nav.Link>
              <Nav.Link
                as={Link}
                to="/emplazamientos"
                active={isActive('/emplazamientos')}
              >
                <i className="bi bi-geo-alt me-1"></i>
                Emplazamientos
              </Nav.Link>
              <Nav.Link
                as={Link}
                to="/depositos"
                active={isActive('/depositos')}
              >
                <i className="bi bi-archive me-1"></i>
                Depósitos
              </Nav.Link>
              <Nav.Link
                as={Link}
                to="/alertas"
                active={isActive('/alertas')}
              >
                <i className="bi bi-exclamation-triangle me-1"></i>
                Alertas
              </Nav.Link>
              <NavDropdown
                title={
                  <>
                    <i className="bi bi-cpu me-1"></i>
                    Inteligencia IA
                  </>
                }
                id="ia-dropdown"
                active={location.pathname.startsWith('/ia')}
              >
                <NavDropdown.Item as={Link} to="/ia/chat">
                  <i className="bi bi-chat-dots me-2"></i>
                  Chat IA
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/ia/insights">
                  <i className="bi bi-lightbulb me-2"></i>
                  Insights
                </NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item as={Link} to="/ia/config">
                  <i className="bi bi-gear me-2"></i>
                  Configuración
                </NavDropdown.Item>
              </NavDropdown>
              {user?.role === 'admin' && (
                <Nav.Link
                  as={Link}
                  to="/admin/dashboard"
                  active={location.pathname.startsWith('/admin')}
                >
                  <i className="bi bi-shield-lock-fill me-1"></i>
                  Admin Panel
                </Nav.Link>
              )}
            </Nav>
            <Nav>
              <Navbar.Text className="me-3">
                <i className="bi bi-person-circle me-1"></i>
                {user?.name || user?.email}
                {user?.role === 'admin' && (
                  <span className="badge bg-warning text-dark ms-2">Admin</span>
                )}
              </Navbar.Text>
              <Nav.Link onClick={handleLogout}>
                <i className="bi bi-box-arrow-right me-1"></i>
                Salir
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Main Content */}
      <div className="flex-grow-1 bg-light">
        {children}
      </div>
    </div>
  );
};

export default MainLayout;
