import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppointments } from '../contexts/AppointmentContext';
import { 
  Building2, 
  Package, 
  DollarSign, 
  Calendar, 
  Users,
  Bell,
  Settings,
  LogOut,
  TrendingUp,
  Activity,
  Stethoscope
} from 'lucide-react';

const PrivateHospitalDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { appointments } = useAppointments();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/hospital', icon: Activity, key: 'dashboard' },
    { name: 'Kit Management', href: '/hospital/kits', icon: Package, key: 'kits' },
    { name: 'Appointments', href: '/hospital/appointments', icon: Calendar, key: 'appointments' },
    { name: 'Doctors', href: '/hospital/doctors', icon: Users, key: 'doctors' },
    { name: 'Revenue', href: '/hospital/revenue', icon: DollarSign, key: 'revenue' },
    { name: 'Subscriptions', href: '/hospital/subscriptions', icon: TrendingUp, key: 'subscriptions' },
  ];

  const DashboardOverview = () => (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">{user?.name}</h2>
        <p className="text-indigo-100">Hospital Management Dashboard</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Kits</p>
              <p className="text-2xl font-bold text-gray-900">24</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Doctors</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">234</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Revenue</p>
              <p className="text-2xl font-bold text-gray-900">$45,200</p>
            </div>
          </div>
        </div>
      </div>

      {/* Kit Management */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Medical Kit Status</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { id: 'KIT-001', status: 'deployed', technician: 'Mike Wilson', patient: 'John Smith' },
              { id: 'KIT-002', status: 'available', technician: '-', patient: '-' },
              { id: 'KIT-003', status: 'maintenance', technician: '-', patient: '-' },
              { id: 'KIT-004', status: 'deployed', technician: 'Sarah Davis', patient: 'Mary Johnson' },
              { id: 'KIT-005', status: 'available', technician: '-', patient: '-' },
              { id: 'KIT-006', status: 'deployed', technician: 'Tom Brown', patient: 'Robert Wilson' }
            ].map((kit) => (
              <div key={kit.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{kit.id}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    kit.status === 'deployed' ? 'bg-green-100 text-green-800' :
                    kit.status === 'available' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {kit.status}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Technician: {kit.technician}</p>
                  <p>Patient: {kit.patient}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Commission & Revenue */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Commission Overview</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 mb-2">Total Consultations</p>
              <p className="text-3xl font-bold text-gray-900">234</p>
              <p className="text-sm text-green-600">+12% from last month</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 mb-2">Commission Earned</p>
              <p className="text-3xl font-bold text-gray-900">$11,700</p>
              <p className="text-sm text-green-600">+8% from last month</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 mb-2">Average per Consultation</p>
              <p className="text-3xl font-bold text-gray-900">$50</p>
              <p className="text-sm text-gray-600">Standard rate</p>
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
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">TeleMedCare - Hospital Portal</h1>
                <p className="text-sm text-gray-600">Private Healthcare Management</p>
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
                    (item.href === '/hospital' && location.pathname === '/hospital');
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
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
              <Route path="/doctors" element={<DashboardOverview />} />
              <Route path="/revenue" element={<DashboardOverview />} />
              <Route path="/subscriptions" element={<DashboardOverview />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
};

export default PrivateHospitalDashboard;