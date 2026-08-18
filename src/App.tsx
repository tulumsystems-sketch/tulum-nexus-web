import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login/Login';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { ProtectedRoute } from './components/ProtectedRoute/ProtectedRoute';
import { LaunchAnnouncement } from './components/LaunchAnnouncement';
import { POS } from './pages/POS/POS';
import { SuperAdminPanel } from './pages/SuperAdmin/SuperAdminPanel';

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
            <ProtectedRoute>
              <Dashboard />
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
            <ProtectedRoute rolesBloqueados={['PREVENTISTA']}>
              <POS />
            </ProtectedRoute>
          }
        />

        {/* Redirección Catch-All (Default de / a /dashboard) */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};


export default App;
