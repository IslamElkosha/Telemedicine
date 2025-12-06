import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface BackButtonProps {
  className?: string;
  showText?: boolean;
  fallbackPath?: string;
}

const BackButton: React.FC<BackButtonProps> = ({
  className = '',
  showText = true,
  fallbackPath
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const getRoleDashboardRoute = (role: string) => {
    const dashboardRoutes: { [key: string]: string } = {
      'patient': '/patient/devices',
      'doctor': '/doctor',
      'technician': '/technician',
      'admin': '/admin',
      'hospital': '/hospital',
      'freelance-tech': '/freelance-tech'
    };
    return dashboardRoutes[role] || `/${role}`;
  };

  const handleBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1 && window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      // Fallback navigation based on user role or provided fallback
      if (fallbackPath) {
        navigate(fallbackPath);
      } else if (user) {
        // Navigate to role-specific dashboard
        const dashboardRoute = getRoleDashboardRoute(user.role);
        console.log('[BackButton] Navigating to dashboard:', dashboardRoute);
        navigate(dashboardRoute);
      } else {
        // Navigate to home page for non-authenticated users
        navigate('/');
      }
    }
  };

  const isHomePage = () => {
    if (!user) return location.pathname === '/';
    const dashboardRoute = getRoleDashboardRoute(user.role);
    return location.pathname === dashboardRoute || location.pathname === `${dashboardRoute}/`;
  };

  // Don't show back button on home pages
  if (isHomePage()) {
    return null;
  }

  return (
    <button
      onClick={handleBack}
      className={`flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors ${className}`}
      aria-label="Go back"
    >
      <ArrowLeft className="h-5 w-5" />
      {showText && <span>Back</span>}
    </button>
  );
};

export default BackButton;