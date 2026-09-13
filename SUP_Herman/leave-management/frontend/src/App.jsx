import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import SetPassword from './pages/SetPassword';
import Dashboard from './pages/Dashboard';
import MyRequests from './pages/MyRequests';
import NewRequest from './pages/NewRequest';
import ManageRequests from './pages/ManageRequests';
import GlobalCalendar from './pages/GlobalCalendar';
import UserManagement from './pages/UserManagement';
import Profile from './pages/Profile';

function SetPasswordRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <SetPassword />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
            <Route path="/reinitialiser-mot-de-passe" element={<ResetPassword />} />
            <Route path="/definir-mot-de-passe" element={<SetPasswordRoute />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="mes-demandes" element={<MyRequests />} />
              <Route path="nouvelle-demande" element={<NewRequest />} />
              <Route
                path="gestion-demandes"
                element={
                  <ProtectedRoute roles={['manager', 'rh']}>
                    <ManageRequests />
                  </ProtectedRoute>
                }
              />
              <Route path="calendrier" element={<GlobalCalendar />} />
              <Route
                path="utilisateurs"
                element={
                  <ProtectedRoute roles={['rh']}>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />
              <Route path="profil" element={<Profile />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
