import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login/Login';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { ProtectedRoute } from './components/ProtectedRoute/ProtectedRoute';
import { LaunchAnnouncement } from './components/LaunchAnnouncement';
import { POS } from './pages/POS/POS';
import { SuperAdminPanel } from './pages/SuperAdmin/SuperAdminPanel';
import { SalidaRider } from './pages/Salida/SalidaRider';
import { homePathForRol } from './utils/session';

const RedirectHome: React.FC = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={homePathForRol(localStorage.getItem('rol'))} replace />;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/launch" element={<LaunchAnnouncement />} />

        {/* Rutas Protegidas (Envueltas en Guard Clause) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute rolesBloqueados={['REPARTIDOR']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/salida"
          element={
            <ProtectedRoute requiredRol="REPARTIDOR">
              <SalidaRider />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRol="SUPER_ADMIN">
              <SuperAdminPanel />
            </ProtectedRoute>
          }
        />

        {/* El preventista toma pedidos en la calle: no cobra por el punto de venta */}
        <Route
          path="/pos"
          element={
            <ProtectedRoute rolesBloqueados={['PREVENTISTA', 'REPARTIDOR']}>
              <POS />
            </ProtectedRoute>
          }
        />

        {/* Redirección Catch-All (Default de / a /dashboard) */}
        <Route path="*" element={<RedirectHome />} />
      </Routes>
    </BrowserRouter>
  );
};


export default App;
