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
        navigate(`/${user.role}`);
      } else {
        // Navigate to home page for non-authenticated users
        navigate('/');
      }
    }
  };

  const isHomePage = () => {
    if (!user) return location.pathname === '/';
    return location.pathname === `/${user.role}` || location.pathname === `/${user.role}/`;
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