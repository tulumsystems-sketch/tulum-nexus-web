import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { IdleSessionGuard } from '../IdleSessionGuard';
import { homePathForRol } from '../../utils/session';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRol?: string;
  /** Roles that cannot access this route even if logged in. */
  rolesBloqueados?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRol, rolesBloqueados }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('rol');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRol && userRole !== requiredRol) {
    return <Navigate to={homePathForRol(userRole)} replace />;
  }

  if (rolesBloqueados && userRole && rolesBloqueados.includes(userRole)) {
    return <Navigate to={homePathForRol(userRole)} replace />;
  }

  return <IdleSessionGuard>{children}</IdleSessionGuard>;
};
