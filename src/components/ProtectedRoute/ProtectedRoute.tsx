import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRol?: string;
}

/**
 * Componente Wrapper para proteger rutas privadas.
 * 
 * Cumple con SRP (Single Responsibility Principle): solo se encarga
 * de validar si hay sesión y opcionalmente autorizar por rol. De ser exitoso,
 * permite montar el hijo; si no, desvía al usuario.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRol }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('rol');

  // Guard Clause: Redirigir inmediatamente si no existe el token
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Guard Clause: Redirigir al dashboard si no tiene el rol requerido
  if (requiredRol && userRole !== requiredRol) {
    return <Navigate to="/dashboard" replace />;
  }

  // Renderizar la vista protegida si la validación es exitosa
  return <>{children}</>;
};
