/**
 * AssetFlow 3.0 - Admin Layout Component
 * Modern admin layout with collapsible sidebar inspired by Facit design
 */

import React, { ReactNode, useState } from 'react';
import { Container, Navbar, Nav, Offcanvas, Button } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './AdminLayout.css';

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showSidebar, setShowSidebar] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const toggleSidebar = () => setShowSidebar(!showSidebar);

  // Sidebar menu items
  const menuItems = [
    {
      section: 'Panel de Administración',
      items: [
        { path: '/admin/dashboard', icon: 'speedometer2', label: 'Dashboard' },
        { path: '/admin/users', icon: 'people-fill', label: 'Gestión de Usuarios' },
        { path: '/admin/system', icon: 'server', label: 'Estado del Sistema' },
        { path: '/admin/settings', icon: 'gear-fill', label: 'Configuración' },
      ],
    },
    {
      section: 'Herramientas del Sistema',
      items: [
        { path: '/admin/terminal', icon: 'terminal-fill', label: 'Terminal' },
        { path: '/admin/backups', icon: 'database-fill-gear', label: 'Backups' },
        { path: '/admin/snapshots', icon: 'camera-fill', label: 'Snapshots' },
      ],
    },
    {
      section: 'Sistema Principal',
      items: [
        { path: '/dashboard', icon: 'house-door', label: 'Volver al Dashboard' },
      ],
    },
  ];

  return (
    <div className="admin-layout">
      {/* Top Navbar */}
      <Navbar bg="dark" variant="dark" expand="lg" className="admin-navbar shadow-sm">
        <Container fluid>
          <Button
            variant="dark"
            className="me-2 d-lg-none"
            onClick={toggleSidebar}
          >
            <i className="bi bi-list"></i>
          </Button>

          <Navbar.Brand className="fw-bold">
            <i className="bi bi-shield-lock-fill me-2 text-warning"></i>
            Admin Panel
          </Navbar.Brand>

          <Nav className="ms-auto d-flex align-items-center">
            <Navbar.Text className="me-3 text-light">
              <i className="bi bi-person-circle me-1"></i>
              {user?.name || user?.email}
              <span className="badge bg-warning text-dark ms-2">Admin</span>
            </Navbar.Text>
            <Nav.Link onClick={handleLogout} className="text-light">
              <i className="bi bi-box-arrow-right me-1"></i>
              Salir
            </Nav.Link>
          </Nav>
        </Container>
      </Navbar>

      <div className="admin-container">
        {/* Desktop Sidebar */}
        <div className="admin-sidebar d-none d-lg-block">
          <div className="sidebar-content">
            {menuItems.map((section, idx) => (
              <div key={idx} className="sidebar-section">
                <div className="sidebar-section-title">{section.section}</div>
                <Nav className="flex-column">
                  {section.items.map((item, itemIdx) => (
                    <Nav.Link
                      key={itemIdx}
                      as={Link}
                      to={item.path}
                      className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
                    >
                      <i className={`bi bi-${item.icon} me-2`}></i>
                      {item.label}
                    </Nav.Link>
                  ))}
                </Nav>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Sidebar (Offcanvas) */}
        <Offcanvas
          show={showSidebar}
          onHide={toggleSidebar}
          placement="start"
          className="d-lg-none"
        >
          <Offcanvas.Header closeButton className="bg-dark text-white">
            <Offcanvas.Title>
              <i className="bi bi-shield-lock-fill me-2 text-warning"></i>
              Admin Panel
            </Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body className="admin-sidebar-mobile">
            {menuItems.map((section, idx) => (
              <div key={idx} className="sidebar-section">
                <div className="sidebar-section-title">{section.section}</div>
                <Nav className="flex-column">
                  {section.items.map((item, itemIdx) => (
                    <Nav.Link
                      key={itemIdx}
                      as={Link}
                      to={item.path}
                      className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
                      onClick={toggleSidebar}
                    >
                      <i className={`bi bi-${item.icon} me-2`}></i>
                      {item.label}
                    </Nav.Link>
                  ))}
                </Nav>
              </div>
            ))}
          </Offcanvas.Body>
        </Offcanvas>

        {/* Main Content */}
        <div className="admin-main-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
