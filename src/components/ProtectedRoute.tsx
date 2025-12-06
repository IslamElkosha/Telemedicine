import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-900 font-semibold text-lg">Loading Patient Data...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait while we verify your session</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const dashboardRoute = getRoleDashboardRoute(user.role);
    return <Navigate to={dashboardRoute} replace />;
  }

  return <>{children}</>;
};

const getRoleDashboardRoute = (role: string) => {
  const dashboardRoutes: { [key: string]: string } = {
    'patient': '/patient',
    'doctor': '/doctor',
    'technician': '/technician',
    'admin': '/admin',
    'hospital': '/hospital',
    'freelance-tech': '/freelance-tech'
  };
  return dashboardRoutes[role] || `/${role}`;
};

export default ProtectedRoute;
