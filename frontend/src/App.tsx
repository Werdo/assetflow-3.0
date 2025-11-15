/**
 * AssetFlow 3.0 - Main App Component
 * Complete application routing with authentication
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { MainLayout } from './components/layout/MainLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ProductosPage from './pages/productos/ProductosPage';
import ClientesPage from './pages/clientes/ClientesPage';
import EmplazamientosPage from './pages/emplazamientos/EmplazamientosPage';
import EmplazamientoDetailPage from './pages/emplazamientos/EmplazamientoDetailPage';
import DepositosPage from './pages/depositos/DepositosPage';
import AlertasPage from './pages/alertas/AlertasPage';
import IAConfigPage from './pages/ia/IAConfigPage';
import IAChatPage from './pages/ia/IAChatPage';
import IAInsightsPage from './pages/ia/IAInsightsPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import UsersPage from './pages/admin/UsersPage';
import SystemPage from './pages/admin/SystemPage';
import SettingsPage from './pages/admin/SettingsPage';
import TerminalPage from './pages/admin/TerminalPage';
import BackupsPage from './pages/admin/BackupsPage';
import SnapshotsPage from './pages/admin/SnapshotsPage';
import BulkOperationsPage from './pages/admin/BulkOperationsPage';
import { Toaster } from 'react-hot-toast';

// Import Bootstrap CSS and Leaflet CSS
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'leaflet/dist/leaflet.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4caf50',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#f44336',
                secondary: '#fff',
              },
            },
          }}
        />

        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <DashboardPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/productos"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ProductosPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/clientes"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ClientesPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/emplazamientos"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <EmplazamientosPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/emplazamientos/:id"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <EmplazamientoDetailPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/depositos"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <DepositosPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/alertas"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <AlertasPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ia/config"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <IAConfigPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ia/chat"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <IAChatPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ia/insights"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <IAInsightsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Admin Routes - Only accessible to admin users */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout>
                  <AdminDashboardPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout>
                  <UsersPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/system"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout>
                  <SystemPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout>
                  <SettingsPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/terminal"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout>
                  <TerminalPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/backups"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout>
                  <BackupsPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/snapshots"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout>
                  <SnapshotsPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/bulk-operations"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout>
                  <BulkOperationsPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 - Not Found */}
          <Route
            path="*"
            element={
              <div className="container mt-5">
                <div className="alert alert-warning">
                  <h4>Página no encontrada</h4>
                  <p>La página que buscas no existe.</p>
                </div>
              </div>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
