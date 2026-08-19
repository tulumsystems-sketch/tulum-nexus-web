import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { IdleSessionGuard } from '../IdleSessionGuard';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRol?: string;
  /** Roles que no pueden acceder a la ruta, aunque estén logueados. */
  rolesBloqueados?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRol, rolesBloqueados }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('rol');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRol && userRole !== requiredRol) {
    return <Navigate to="/dashboard" replace />;
  }

  if (rolesBloqueados && userRole && rolesBloqueados.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <IdleSessionGuard>{children}</IdleSessionGuard>;
};
