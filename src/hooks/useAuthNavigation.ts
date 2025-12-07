import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getRoleDashboardRoute, isPublicRoute } from '../utils/navigation';

export function useAuthNavigation() {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (loading) {
      hasNavigated.current = false;
      return;
    }

    if (isAuthenticated && user && !hasNavigated.current) {
      const currentPath = location.pathname;

      if (isPublicRoute(currentPath)) {
        const dashboardRoute = getRoleDashboardRoute(user.role);
        console.log('[useAuthNavigation] Redirecting authenticated user from public route:', {
          from: currentPath,
          to: dashboardRoute,
          role: user.role
        });
        hasNavigated.current = true;
        navigate(dashboardRoute, { replace: true });
      }
    }
  }, [isAuthenticated, user, loading, navigate, location.pathname]);

  return { loading, isAuthenticated, user };
}
