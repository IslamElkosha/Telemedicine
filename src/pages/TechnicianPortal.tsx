import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTechnician } from '../contexts/TechnicianContext';
import TechnicianAuth from '../components/TechnicianAuth';
import TechnicianNotifications from '../components/TechnicianNotifications';
import TechnicianSettings from '../components/TechnicianSettings';
import TechnicianAppointments from '../components/TechnicianAppointments';
import TechnicianKitManager from '../components/TechnicianKitManager';
import TechnicianEarnings from '../components/TechnicianEarnings';
import { 
  Activity, 
  Calendar, 
  Package, 
  DollarSign, 
  Bell, 
  Settings, 
  LogOut,
  Wrench,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Navigation,
  Phone,
  Route as RouteIcon,
  Battery,
  Signal,
  Wifi,
  TrendingUp,
  Star
} from 'lucide-react';

const TechnicianPortal: React.FC = () => {
  const { 
    profile, 
    assignedKits, 
    appointments, 
    notifications, 
    unreadNotifications,
    logout,
    loading 
  } = useTechnician();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);

  // Redirect to auth if not logged in
  if (!profile) {
    return <TechnicianAuth />;
  }

  const handleLogout = () => {
    const confirmLogout = window.confirm(
      'Are you sure you want to sign out? Any unsaved changes will be lost.'
    );
    
    if (confirmLogout) {
      logout();
      navigate('/', { replace: true });
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/technician', icon: Activity, key: 'dashboard' },
    { name: 'Appointments', href: '/technician/appointments', icon: Calendar, key: 'appointments' },
    { name: 'My Kits', href: '/technician/kits', icon: Package, key: 'kits' },
    { name: 'Earnings', href: '/technician/earnings', icon: DollarSign, key: 'earnings' },
    { name: 'Settings', href: '/technician/settings', icon: Settings, key: 'settings' },
  ];

  const todayAppointments = appointments.filter(apt => {
    const today = new Date();
    const aptDate = new Date(apt.scheduledDate);
    return aptDate.toDateString() === today.toDateString();
  });

  const activeKits = assignedKits.filter(kit => kit.status === 'in-service');
  const outOfServiceKits = assignedKits.filter(kit => kit.status === 'out-of-service');

  // Calculate earnings data
  const calculateEarnings = () => {
    const completedAppointments = appointments.filter(apt => apt.status === 'completed');
    const thisMonthAppointments = completedAppointments.filter(apt => {
      const aptDate = new Date(apt.scheduledDate);
      const now = new Date();
      return aptDate.getMonth() === now.getMonth() && aptDate.getFullYear() === now.getFullYear();
    });
    
    const monthlyEarnings = thisMonthAppointments.reduce((sum, apt) => sum + (apt.technicianEarnings || 0), 0);
    const weeklyEarnings = Math.floor(monthlyEarnings / 4);
    
    return {
      monthly: monthlyEarnings,
      weekly: weeklyEarnings,
      totalVisits: completedAppointments.length,
      monthlyVisits: thisMonthAppointments.length
    };
  };

  const earningsData = calculateEarnings();
  const DashboardOverview = () => (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Welcome, {profile.name}!</h2>
            <p className="text-purple-100">
              {profile.employmentType === 'employed' ? 'Employed Technician' : 'Freelance Technician'}
            </p>
            <p className="text-purple-100 text-sm">
              Service Area: {profile.serviceArea.cities.length} cities • Rating: {profile.rating || 4.8}/5
            </p>
          </div>
          <div className="text-right">
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <p className="text-purple-100 text-sm">Today's Appointments</p>
              <p className="text-3xl font-bold">{todayAppointments.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <Package className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">My Kits</p>
              <p className="text-2xl font-bold text-gray-900">{activeKits.length}</p>
              <p className="text-xs text-gray-500">{assignedKits.length} total assigned</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Visits</p>
              <p className="text-2xl font-bold text-gray-900">{profile.totalVisits}</p>
              <p className="text-xs text-gray-500">{earningsData.monthlyVisits} this month</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Monthly Earnings</p>
              <p className="text-2xl font-bold text-gray-900">{earningsData.monthly.toLocaleString()} LE</p>
              <p className="text-xs text-gray-500">{earningsData.weekly.toLocaleString()} LE weekly</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Star className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rating</p>
              <p className="text-2xl font-bold text-gray-900">{profile.rating || 4.8}</p>
              <p className="text-xs text-gray-500">Based on {profile.totalVisits} visits</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-indigo-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Performance</p>
              <p className="text-2xl font-bold text-gray-900">98%</p>
              <p className="text-xs text-gray-500">Completion rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link
            to="/technician/appointments"
            className="bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg p-4 transition-colors group"
          >
            <div className="flex items-center space-x-3">
              <Calendar className="h-6 w-6 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">View Appointments</p>
                <p className="text-sm text-blue-700">{todayAppointments.length} today</p>
              </div>
            </div>
          </Link>
          
          <Link
            to="/technician/kits"
            className="bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg p-4 transition-colors group"
          >
            <div className="flex items-center space-x-3">
              <Package className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Manage Kits</p>
                <p className="text-sm text-green-700">{activeKits.length} active</p>
              </div>
            </div>
          </Link>
          
          <Link
            to="/technician/earnings"
            className="bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-lg p-4 transition-colors group"
          >
            <div className="flex items-center space-x-3">
              <DollarSign className="h-6 w-6 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-900">View Earnings</p>
                <p className="text-sm text-yellow-700">{earningsData.monthly.toLocaleString()} LE</p>
              </div>
            </div>
          </Link>
          
          <button
            onClick={() => setShowNotifications(true)}
            className="bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg p-4 transition-colors group"
          >
            <div className="flex items-center space-x-3">
              <Bell className="h-6 w-6 text-purple-600" />
              <div>
                <p className="font-medium text-purple-900">Notifications</p>
                <p className="text-sm text-purple-700">{unreadNotifications} unread</p>
              </div>
            </div>
          </button>
        </div>
      </div>
      {/* Kit Status Alert */}
      {outOfServiceKits.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-red-900">Kits Out of Service</h3>
          </div>
          <p className="text-red-800 text-sm mt-1">
            {outOfServiceKits.length} kit{outOfServiceKits.length !== 1 ? 's are' : ' is'} currently out of service. 
            New appointments in your area are being reassigned to other technicians.
          </p>
          <div className="mt-2">
            {outOfServiceKits.map(kit => (
              <span key={kit.id} className="inline-block bg-red-100 text-red-800 px-2 py-1 rounded text-xs mr-2">
                {kit.kitNumber}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Today's Schedule */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Today's Schedule</h3>
        </div>
        <div className="p-6">
          {todayAppointments.length > 0 ? (
            <div className="space-y-4">
              {todayAppointments.map(appointment => (
                <div key={appointment.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-lg ${
                        appointment.priority === 'emergency' ? 'bg-red-100' :
                        appointment.priority === 'urgent' ? 'bg-yellow-100' :
                        'bg-blue-100'
                      }`}>
                        <Wrench className={`h-5 w-5 ${
                          appointment.priority === 'emergency' ? 'text-red-600' :
                          appointment.priority === 'urgent' ? 'text-yellow-600' :
                          'text-blue-600'
                        }`} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{appointment.patientName}</h4>
                        <p className="text-sm text-gray-600">Dr. {appointment.doctorName} - {appointment.specialty}</p>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {appointment.scheduledTime}
                          </span>
                          <span className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {appointment.patientAddress.split(',')[0]}
                          </span>
                          <span className="flex items-center">
                            <Phone className="h-4 w-4 mr-1" />
                            {appointment.patientPhone}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            appointment.priority === 'emergency' ? 'bg-red-100 text-red-800' :
                            appointment.priority === 'urgent' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {appointment.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => window.open(`https://maps.google.com/maps?q=${encodeURIComponent(appointment.patientAddress)}`, '_blank')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <Navigation className="h-4 w-4" />
                        Navigate
                      </button>
                      <button 
                        onClick={() => window.open(`tel:${appointment.patientPhone}`, '_self')}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                      >
                        <Phone className="h-4 w-4" />
                        <span>Call</span>
                      </button>
                      <Link
                        to="/technician/appointments"
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                      >
                        <RouteIcon className="h-4 w-4" />
                        Start Visit
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No appointments scheduled for today</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Kit Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">My Medical Kits</h3>
            <Link 
              to="/technician/kits"
              className="text-purple-600 hover:text-purple-700 text-sm font-medium"
            >
              Manage All Kits →
            </Link>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignedKits.map(kit => (
              <div key={kit.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{kit.kitNumber}</h4>
                    <p className="text-xs text-gray-500">{kit.serialNumber}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    kit.status === 'in-service' ? 'bg-green-100 text-green-800' :
                    kit.status === 'out-of-service' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {kit.status.replace('-', ' ')}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-3 space-y-1">
                  <p>Devices: {kit.devices.length}</p>
                  <div className="flex items-center space-x-2">
                    <Battery className={`h-4 w-4 ${kit.batteryStatus > 20 ? 'text-green-600' : 'text-red-600'}`} />
                    <span>Battery: {kit.batteryStatus}%</span>
                  </div>
                  <p>Condition: {kit.condition}</p>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>{kit.location.city}</span>
                  </div>
                </div>
                <Link 
                  to="/technician/kits"
                  className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                >
                  <Wrench className="h-4 w-4" />
                  <span>Manage Kit</span>
                </Link>
              </div>
            ))}
          </div>
          
          {/* Kit Performance Summary */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Kit Performance Summary</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">{activeKits.length}</p>
                <p className="text-xs text-gray-600">Active Kits</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round(assignedKits.reduce((sum, kit) => sum + kit.batteryStatus, 0) / assignedKits.length)}%
                </p>
                <p className="text-xs text-gray-600">Avg Battery</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {assignedKits.filter(kit => kit.condition === 'excellent').length}
                </p>
                <p className="text-xs text-gray-600">Excellent Condition</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {[
              { action: 'Completed appointment', patient: 'John Smith', time: '2 hours ago', type: 'success' },
              { action: 'Kit maintenance scheduled', kit: 'KIT-001', time: '4 hours ago', type: 'info' },
              { action: 'New appointment assigned', patient: 'Mary Johnson', time: '6 hours ago', type: 'info' },
              { action: 'Device test completed', device: 'Blood Pressure Monitor', time: '1 day ago', type: 'success' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${
                  activity.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500">
                    {activity.patient && `Patient: ${activity.patient}`}
                    {activity.kit && `Kit: ${activity.kit}`}
                    {activity.device && `Device: ${activity.device}`}
                  </p>
                </div>
                <span className="text-xs text-gray-500">{activity.time}</span>
              </div>
            ))}
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
              <div className="bg-purple-600 p-2 rounded-lg">
                <Wrench className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">TeleMedCare - Technician Portal</h1>
                <p className="text-sm text-gray-600">
                  {profile.name} • {profile.employmentType === 'employed' ? 'Employed' : 'Freelance'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Service Status */}
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
                profile.status === 'active' ? 'bg-green-100 text-green-800' :
                profile.status === 'out-of-service' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                <div className={`h-2 w-2 rounded-full ${
                  profile.status === 'active' ? 'bg-green-500' :
                  profile.status === 'out-of-service' ? 'bg-red-500' :
                  'bg-gray-500'
                }`}></div>
                <span className="text-sm font-medium capitalize">
                  {profile.status.replace('-', ' ')}
                </span>
              </div>

              {/* Notifications */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="text-gray-600 hover:text-gray-900 p-2 relative"
                >
                  <Bell className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <TechnicianNotifications onClose={() => setShowNotifications(false)} />
                )}
              </div>

              {/* Settings */}
              <button 
                onClick={() => navigate('/technician/settings')}
                className="text-gray-600 hover:text-gray-900 p-2"
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>

              {/* Exit Button */}
              <div className="relative group">
                <button 
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-red-600 p-2 transition-colors duration-200 flex items-center space-x-2"
                  title="Sign out securely"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="hidden md:inline text-sm font-medium">Exit</span>
                </button>
                
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                  Sign out securely
                </div>
              </div>
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
                    (item.href === '/technician' && location.pathname === '/technician');
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
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
              <Route path="/appointments" element={<TechnicianAppointments />} />
              <Route path="/kits" element={<TechnicianKitManager />} />
              <Route path="/earnings" element={<TechnicianEarnings />} />
              <Route path="/settings" element={<TechnicianSettings />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
};

export default TechnicianPortal;