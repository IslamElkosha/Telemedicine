import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader } from 'lucide-react';
import { getRoleDashboardRoute, getRoleName } from '../utils/navigation';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  console.log('[ProtectedRoute] Render check:', {
    path: location.pathname,
    loading,
    isAuthenticated,
    hasUser: !!user,
    userRole: user?.role,
    allowedRoles,
    timestamp: new Date().toISOString()
  });

  if (loading) {
    const loadingRole = allowedRoles?.[0] || 'User';
    const displayName = getRoleName(loadingRole as any);

    console.log('[ProtectedRoute] Showing loading screen for role:', loadingRole);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl">
          <Loader className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-900 font-semibold text-lg">Loading {displayName} Dashboard...</p>
          <p className="text-gray-500 text-sm mt-2">Verifying your session</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    console.log('[ProtectedRoute] Redirecting to home - not authenticated or no user');
    return <Navigate to="/" state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const dashboardRoute = getRoleDashboardRoute(user.role);
    console.log('[ProtectedRoute] Role mismatch, redirecting:', {
      userRole: user.role,
      allowedRoles,
      redirectTo: dashboardRoute
    });
    return <Navigate to={dashboardRoute} replace />;
  }

  console.log('[ProtectedRoute] Access granted, rendering children');
  return <>{children}</>;
};

export default ProtectedRoute;
