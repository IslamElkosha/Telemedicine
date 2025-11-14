import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppointments } from '../contexts/AppointmentContext';
import { 
  User, 
  Package, 
  DollarSign, 
  Calendar, 
  TrendingUp,
  Bell,
  Settings,
  LogOut,
  Activity,
  Wrench,
  MapPin
} from 'lucide-react';

const FreelanceTechnicianDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { appointments } = useAppointments();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/freelance-tech', icon: Activity, key: 'dashboard' },
    { name: 'My Kits', href: '/freelance-tech/kits', icon: Package, key: 'kits' },
    { name: 'Appointments', href: '/freelance-tech/appointments', icon: Calendar, key: 'appointments' },
    { name: 'Earnings', href: '/freelance-tech/earnings', icon: DollarSign, key: 'earnings' },
    { name: 'Subscriptions', href: '/freelance-tech/subscriptions', icon: TrendingUp, key: 'subscriptions' },
  ];

  const DashboardOverview = () => (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">{user?.name}</h2>
        <p className="text-teal-100">Independent Technician Dashboard</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Earnings</p>
              <p className="text-2xl font-bold text-gray-900">$1,840</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">My Kits</p>
              <p className="text-2xl font-bold text-gray-900">3</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rating</p>
              <p className="text-2xl font-bold text-gray-900">4.9</p>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Kit Management */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">My Medical Kits</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: 'PERSONAL-001', name: 'Primary Kit', status: 'active', devices: 5 },
              { id: 'PERSONAL-002', name: 'Backup Kit', status: 'available', devices: 4 },
              { id: 'PERSONAL-003', name: 'Cardiology Kit', status: 'maintenance', devices: 3 }
            ].map((kit) => (
              <div key={kit.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{kit.name}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    kit.status === 'active' ? 'bg-green-100 text-green-800' :
                    kit.status === 'available' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {kit.status}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Kit ID: {kit.id}</p>
                  <p>Devices: {kit.devices}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Earnings & Commission */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Earnings & Commission</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">This Month</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Home Visits (8)</span>
                  <span className="font-medium">$1,200</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Equipment Usage</span>
                  <span className="font-medium">$320</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Travel Allowance</span>
                  <span className="font-medium">$180</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bonus</span>
                  <span className="font-medium">$140</span>
                </div>
                <hr className="my-3" />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-green-600">$1,840</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Subscription Status</h4>
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-teal-900">Professional Plan</h5>
                  <span className="text-sm font-medium text-teal-600">Active</span>
                </div>
                <p className="text-sm text-teal-700 mb-3">
                  Full access to platform features and premium device support
                </p>
                <p className="text-sm text-teal-600">
                  Next payment: Feb 15, 2025 ($99/month)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-teal-600 p-2 rounded-lg">
                <Wrench className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">TeleMedCare - Freelance</h1>
                <p className="text-sm text-gray-600">Independent Technician</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-gray-600 hover:text-gray-900 p-2">
                <Bell className="h-5 w-5" />
              </button>
              <button className="text-gray-600 hover:text-gray-900 p-2">
                <Settings className="h-5 w-5" />
              </button>
              <button 
                onClick={logout}
                className="text-gray-600 hover:text-gray-900 p-2"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full lg:w-64">
            <nav className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="space-y-2">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href || 
                    (item.href === '/freelance-tech' && location.pathname === '/freelance-tech');
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-teal-50 text-teal-700 border border-teal-200'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<DashboardOverview />} />
              <Route path="/kits" element={<DashboardOverview />} />
              <Route path="/appointments" element={<DashboardOverview />} />
              <Route path="/earnings" element={<DashboardOverview />} />
              <Route path="/subscriptions" element={<DashboardOverview />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
};

export default FreelanceTechnicianDashboard;