import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Heart, Shield, Users, Video, Stethoscope, Calendar } from 'lucide-react';
import AuthModal from '../components/AuthModal';
import { getRoleDashboardRoute } from '../utils/navigation';

const LandingPage: React.FC = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, loading } = useAuth();

  const redirectTo = (location.state as any)?.from;

  useEffect(() => {
    if (loading) {
      console.log('[LandingPage] Still loading auth state');
      return;
    }

    if (isAuthModalOpen || justLoggedIn) {
      console.log('[LandingPage] Skipping auto-redirect:', { isAuthModalOpen, justLoggedIn });
      return;
    }

    console.log('[LandingPage] Auth state:', {
      isAuthenticated,
      hasUser: !!user,
      userRole: user?.role,
      userEmail: user?.email
    });

    if (isAuthenticated && user) {
      const dashboardRoute = getRoleDashboardRoute(user.role);
      console.log('[LandingPage] User authenticated, redirecting to:', {
        userRole: user.role,
        dashboardRoute,
        timestamp: new Date().toISOString()
      });
      navigate(dashboardRoute, { replace: true });
    }
  }, [isAuthenticated, user, loading, isAuthModalOpen, justLoggedIn, navigate]);

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    setIsAuthModalOpen(true);
  };

  const handleAuthModalClose = () => {
    console.log('[LandingPage] Auth modal closing, setting justLoggedIn flag');
    setIsAuthModalOpen(false);
    setJustLoggedIn(true);
    setTimeout(() => {
      console.log('[LandingPage] Clearing justLoggedIn flag');
      setJustLoggedIn(false);
    }, 3000);
  };

  const features = [
    {
      icon: Video,
      title: 'Video Consultations',
      description: 'High-quality video calls with real-time medical data integration'
    },
    {
      icon: Stethoscope,
      title: 'Device Integration',
      description: 'Connect multiple medical devices for comprehensive remote examinations'
    },
    {
      icon: Calendar,
      title: 'Smart Scheduling',
      description: 'Intelligent appointment booking with technician coordination'
    },
    {
      icon: Shield,
      title: 'Secure & Compliant',
      description: 'HIPAA compliant with end-to-end encryption for all communications'
    },
    {
      icon: Users,
      title: 'Multi-Role Platform',
      description: 'Dedicated interfaces for patients, doctors, technicians, and administrators'
    },
    {
      icon: Heart,
      title: 'Real-time Monitoring',
      description: 'Live vital signs and medical device readings during consultations'
    }
  ];

  const roles = [
    {
      role: 'patient',
      title: 'Patient',
      description: 'Book consultations, track technicians, and connect with doctors',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      role: 'doctor',
      title: 'Doctor',
      description: 'Manage appointments, conduct video consultations, and access patient data',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      role: 'technician',
      title: 'Technician',
      description: 'View assignments, navigate to patients, and manage medical devices',
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      role: 'admin',
      title: 'Administrator',
      description: 'Manage users, track kits, oversee operations, and generate reports',
      color: 'bg-red-500 hover:bg-red-600'
    },
    {
      role: 'hospital',
      title: 'Private Hospital',
      description: 'Manage kits, appointments, subscriptions, and revenue tracking',
      color: 'bg-indigo-500 hover:bg-indigo-600'
    },
    {
      role: 'freelance-tech',
      title: 'Freelance Technician',
      description: 'Independent practice with kit management and commission tracking',
      color: 'bg-teal-500 hover:bg-teal-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">TeleMedCare</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors">Features</a>
              <a href="#roles" className="text-gray-600 hover:text-blue-600 transition-colors">Access Portal</a>
              <a href="#contact" className="text-gray-600 hover:text-blue-600 transition-colors">Contact</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Revolutionary Remote Healthcare
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Connect patients with healthcare professionals through integrated video consultations, 
            real-time medical device monitoring, and comprehensive care management.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => handleRoleSelect('patient')}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 font-semibold"
            >
              Register as Patient
            </button>
            <button 
              onClick={() => handleRoleSelect('doctor')}
              className="bg-white text-blue-600 border-2 border-blue-600 px-8 py-3 rounded-lg hover:bg-blue-50 transition-all transform hover:scale-105 font-semibold"
            >
              Join as Healthcare Provider
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Already have an account? Click any role above to sign in.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Advanced Telemedicine Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-50 p-6 rounded-xl hover:shadow-lg transition-all transform hover:-translate-y-1">
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h4>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Role Access Section */}
      <section id="roles" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Access Your Dashboard
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((roleData, index) => (
              <div 
                key={index}
                onClick={() => handleRoleSelect(roleData.role)}
                className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all transform hover:-translate-y-2 cursor-pointer border border-gray-200"
              >
                <div className={`w-12 h-12 rounded-lg ${roleData.color} flex items-center justify-center mb-4 transition-colors`}>
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">{roleData.title}</h4>
                <p className="text-gray-600 mb-4">{roleData.description}</p>
                <button className={`w-full py-2 px-4 rounded-lg text-white font-medium ${roleData.color} transition-colors`}>
                  Access Dashboard
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold">TeleMedCare</h1>
          </div>
          <p className="text-gray-400 mb-4">Revolutionizing healthcare delivery through technology</p>
          <p className="text-sm text-gray-500">© 2025 TeleMedCare. All rights reserved.</p>
        </div>
      </footer>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={handleAuthModalClose}
        selectedRole={selectedRole}
        redirectTo={redirectTo}
      />
    </div>
  );
};

export default LandingPage;