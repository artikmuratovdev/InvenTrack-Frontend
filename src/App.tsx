import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { AdminReferencesPage } from './views/AdminReferencesPage';
import { AdminUsersPage } from './views/AdminUsersPage';
import { DashboardPage } from './views/DashboardPage';
import { EquipmentDetailPage } from './views/EquipmentDetailPage';
import { EquipmentFormPage } from './views/EquipmentFormPage';
import { EquipmentListPage } from './views/EquipmentListPage';
import { LoginPage } from './views/LoginPage';
import { RepairsPage } from './views/RepairsPage';
import { ReportsPage } from './views/ReportsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/equipment"
            element={
              <ProtectedRoute>
                <EquipmentListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/equipment/new"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <EquipmentFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/equipment/:id"
            element={
              <ProtectedRoute>
                <EquipmentDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/equipment/:id/edit"
            element={
              <ProtectedRoute roles={['ADMIN', 'RESPONSIBLE']}>
                <EquipmentFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/repairs"
            element={
              <ProtectedRoute>
                <RepairsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/references"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <AdminReferencesPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
