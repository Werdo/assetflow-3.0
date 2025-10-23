/**
 * AssetFlow 3.0 - Admin Users Management Page
 * Complete user management with CRUD operations
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Badge, Spinner, Alert, InputGroup } from 'react-bootstrap';
import toast from 'react-hot-toast';
import adminService, { CreateUserData, UpdateUserData } from '../../services/adminService';
import type { User } from '../../types';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form states
  const [formData, setFormData] = useState<CreateUserData>({
    name: '',
    email: '',
    password: '',
    role: 'user',
    active: true,
  });

  const [resetPasswordData, setResetPasswordData] = useState({ newPassword: '' });

  /**
   * Load users
   */
  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAllUsers({
        search: searchTerm || undefined,
        role: roleFilter ? (roleFilter as any) : undefined,
      });
      // Handle both possible response structures
      const usersData = (response.data as any).items || (response.data as any).users || [];
      setUsers(usersData);
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [searchTerm, roleFilter]);

  /**
   * Handle create user
   */
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminService.createUser(formData);
      toast.success('Usuario creado exitosamente');
      setShowCreateModal(false);
      resetForm();
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Error al crear usuario');
    }
  };

  /**
   * Handle update user
   */
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const updateData: UpdateUserData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        active: formData.active,
      };
      await adminService.updateUser(selectedUser._id, updateData);
      toast.success('Usuario actualizado exitosamente');
      setShowEditModal(false);
      resetForm();
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar usuario');
    }
  };

  /**
   * Handle delete user
   */
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      await adminService.deleteUser(selectedUser._id);
      toast.success('Usuario eliminado exitosamente');
      setShowDeleteModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar usuario');
    }
  };

  /**
   * Handle reset password
   */
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      await adminService.resetUserPassword(selectedUser._id, resetPasswordData);
      toast.success('Contraseña restablecida exitosamente');
      setShowResetPasswordModal(false);
      setSelectedUser(null);
      setResetPasswordData({ newPassword: '' });
    } catch (error: any) {
      toast.error(error.message || 'Error al restablecer contraseña');
    }
  };

  /**
   * Open edit modal
   */
  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      active: user.active,
    });
    setShowEditModal(true);
  };

  /**
   * Open delete modal
   */
  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  /**
   * Open reset password modal
   */
  const openResetPasswordModal = (user: User) => {
    setSelectedUser(user);
    setShowResetPasswordModal(true);
  };

  /**
   * Reset form
   */
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'user',
      active: true,
    });
    setSelectedUser(null);
  };

  /**
   * Get role badge variant
   */
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge bg="danger">Admin</Badge>;
      case 'manager':
        return <Badge bg="warning">Manager</Badge>;
      case 'user':
        return <Badge bg="info">Usuario</Badge>;
      default:
        return <Badge bg="secondary">{role}</Badge>;
    }
  };

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="fw-bold mb-1">Gestión de Usuarios</h2>
              <p className="text-muted mb-0">Administrar usuarios del sistema</p>
            </div>
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Crear Usuario
            </Button>
          </div>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-4">
        <Col md={6}>
          <InputGroup>
            <InputGroup.Text>
              <i className="bi bi-search"></i>
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={3}>
          <Form.Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">Todos los roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="user">Usuario</option>
          </Form.Select>
        </Col>
      </Row>

      {/* Users Table */}
      <Row>
        <Col>
          <Card className="shadow-sm">
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3 text-muted">Cargando usuarios...</p>
                </div>
              ) : users.length === 0 ? (
                <Alert variant="info" className="m-3">
                  No se encontraron usuarios
                </Alert>
              ) : (
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Nombre</th>
                        <th>Email</th>
                        <th>Rol</th>
                        <th>Estado</th>
                        <th>Fecha de Registro</th>
                        <th className="text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user._id}>
                          <td className="align-middle">
                            <strong>{user.name}</strong>
                          </td>
                          <td className="align-middle">{user.email}</td>
                          <td className="align-middle">{getRoleBadge(user.role)}</td>
                          <td className="align-middle">
                            {user.active ? (
                              <Badge bg="success">Activo</Badge>
                            ) : (
                              <Badge bg="secondary">Inactivo</Badge>
                            )}
                          </td>
                          <td className="align-middle">
                            {new Date(user.createdAt).toLocaleDateString('es-ES')}
                          </td>
                          <td className="align-middle text-center">
                            <div className="d-flex gap-1 justify-content-center">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => openEditModal(user)}
                                title="Editar usuario"
                              >
                                <i className="bi bi-pencil"></i>
                              </Button>
                              <Button
                                variant="outline-warning"
                                size="sm"
                                onClick={() => openResetPasswordModal(user)}
                                title="Restablecer contraseña"
                              >
                                <i className="bi bi-key"></i>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => openDeleteModal(user)}
                                title="Eliminar usuario"
                              >
                                <i className="bi bi-trash"></i>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Create User Modal */}
      <Modal show={showCreateModal} onHide={() => { setShowCreateModal(false); resetForm(); }}>
        <Modal.Header closeButton>
          <Modal.Title>Crear Nuevo Usuario</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateUser}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Contraseña</Form.Label>
              <Form.Control
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
              <Form.Text className="text-muted">Mínimo 6 caracteres</Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Rol</Form.Label>
              <Form.Select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              >
                <option value="user">Usuario</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </Form.Select>
            </Form.Group>

            <Form.Group>
              <Form.Check
                type="checkbox"
                label="Usuario activo"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => { setShowCreateModal(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Crear Usuario
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Edit User Modal */}
      <Modal show={showEditModal} onHide={() => { setShowEditModal(false); resetForm(); }}>
        <Modal.Header closeButton>
          <Modal.Title>Editar Usuario</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdateUser}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Rol</Form.Label>
              <Form.Select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              >
                <option value="user">Usuario</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </Form.Select>
            </Form.Group>

            <Form.Group>
              <Form.Check
                type="checkbox"
                label="Usuario activo"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => { setShowEditModal(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Guardar Cambios
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete User Modal */}
      <Modal show={showDeleteModal} onHide={() => { setShowDeleteModal(false); setSelectedUser(null); }}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar Eliminación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="danger">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            Esta acción no se puede deshacer. ¿Estás seguro de que deseas eliminar al usuario <strong>{selectedUser?.name}</strong>?
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowDeleteModal(false); setSelectedUser(null); }}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDeleteUser}>
            Eliminar Usuario
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Reset Password Modal */}
      <Modal show={showResetPasswordModal} onHide={() => { setShowResetPasswordModal(false); setSelectedUser(null); setResetPasswordData({ newPassword: '' }); }}>
        <Modal.Header closeButton>
          <Modal.Title>Restablecer Contraseña</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleResetPassword}>
          <Modal.Body>
            <p>Restablecer contraseña para <strong>{selectedUser?.name}</strong></p>
            <Form.Group>
              <Form.Label>Nueva Contraseña</Form.Label>
              <Form.Control
                type="password"
                value={resetPasswordData.newPassword}
                onChange={(e) => setResetPasswordData({ newPassword: e.target.value })}
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => { setShowResetPasswordModal(false); setSelectedUser(null); setResetPasswordData({ newPassword: '' }); }}>
              Cancelar
            </Button>
            <Button variant="warning" type="submit">
              Restablecer Contraseña
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default UsersPage;
