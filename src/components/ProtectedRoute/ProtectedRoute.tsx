import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Componente Wrapper para proteger rutas privadas.
 * 
 * Cumple con SRP (Single Responsibility Principle): solo se encarga
 * de validar si hay sesión. De ser exitoso, permite montar el hijo;
 * si no, desvía al usuario al origen (login).
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = localStorage.getItem('token');

  // Guard Clause: Redirigir inmediatamente si no existe el token
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Renderizar la vista protegida si la validación es exitosa
  return <>{children}</>;
};
