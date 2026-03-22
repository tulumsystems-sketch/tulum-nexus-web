import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRol?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRol }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('rol');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRol && userRole !== requiredRol) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
