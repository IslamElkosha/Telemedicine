import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppointments } from '../contexts/AppointmentContext';
import { useNotifications } from '../contexts/NotificationContext';
import BackButton from '../components/BackButton';
import NotificationDropdown from '../components/NotificationDropdown';
import { 
  Calendar, 
  Video, 
  FileText, 
  Users, 
  Clock, 
  Heart,
  Bell,
  Settings,
  LogOut,
  Activity,
  Stethoscope,
  UserCheck,
  ChevronRight,
  DollarSign,
  User,
  Phone,
  PhoneCall,
  CheckCircle,
  AlertCircle,
  Loader,
  X,
  Save,
  Edit3
} from 'lucide-react';

const DoctorDashboard: React.FC = () => {
  const { user, logout, updateProfile, loading: authLoading } = useAuth();
  const { appointments, getAppointmentsByUser, updateAppointment } = useAppointments();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    specialty: user?.specialty || '',
    experience: user?.experience || 0,
    bio: ''
  });
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const handleLogout = async () => {
    const confirmLogout = window.confirm(
      'Are you sure you want to sign out?'
    );

    if (!confirmLogout) return;

    try {
      await logout();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      await logout();
      navigate('/', { replace: true });
    }
  };

  const doctorAppointments = getAppointmentsByUser(user?.id || '2', 'doctor');
  const todayAppointments = doctorAppointments.filter(apt => 
    apt.date.toDateString() === new Date().toDateString()
  );
  const upcomingAppointments = doctorAppointments.filter(apt => apt.status === 'scheduled');
  const completedAppointments = doctorAppointments.filter(apt => apt.status === 'completed');

  const navigation = [
    { name: 'Dashboard', href: '/doctor', icon: Activity, key: 'dashboard' },
    { name: 'Appointments', href: '/doctor/appointments', icon: Calendar, key: 'appointments' },
    { name: 'Patients', href: '/doctor/patients', icon: Users, key: 'patients' },
    { name: 'Consultations', href: '/doctor/consultations', icon: Video, key: 'consultations' },
    { name: 'Financial', href: '/doctor/financial', icon: DollarSign, key: 'financial' },
    { name: 'Settings', href: '/doctor/settings', icon: Settings, key: 'settings' },
  ];

  // Update profile data when user changes
  React.useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        specialty: user.specialty || '',
        experience: user.experience || 0,
        bio: ''
      });
    }
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);
    
    const result = await updateProfile(profileData);
    
    if (result.success) {
      setProfileSuccess(true);
      setIsEditingProfile(false);
      setTimeout(() => setProfileSuccess(false), 3000);
    } else {
      setProfileError(result.error?.message || 'Failed to update profile');
    }
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setProfileError(null);
    setProfileSuccess(false);
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        specialty: user.specialty || '',
        experience: user.experience || 0,
        bio: ''
      });
    }
  };

  const startVideoCall = (appointmentId: string) => {
    updateAppointment(appointmentId, { status: 'in-progress' });
    navigate(`/video-call/${appointmentId}`);
  };

  const calculateRevenue = () => {
    const completedThisMonth = completedAppointments.filter(apt => {
      const appointmentDate = new Date(apt.date);
      const now = new Date();
      return appointmentDate.getMonth() === now.getMonth() && 
             appointmentDate.getFullYear() === now.getFullYear();
    });
    
    const totalRevenue = completedThisMonth.length * 375; // 50% of 750 LE
    return {
      consultations: completedThisMonth.length,
      revenue: totalRevenue,
      weeklyAverage: Math.round(totalRevenue / 4)
    };
  };

  const revenueData = calculateRevenue();

  const DashboardOverview = () => (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Good morning, {user?.name}!</h2>
        <p className="text-green-100">You have {todayAppointments.length} appointments today</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today</p>
              <p className="text-2xl font-bold text-gray-900">{todayAppointments.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Patients</p>
              <p className="text-2xl font-bold text-gray-900">127</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Video className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Consultations</p>
              <p className="text-2xl font-bold text-gray-900">89</p>
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
              <p className="text-2xl font-bold text-gray-900">{revenueData.revenue} LE</p>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Today's Schedule</h3>
        </div>
        <div className="p-6">
          {todayAppointments.length > 0 ? (
            <div className="space-y-4">
              {todayAppointments.map(appointment => (
                <div key={appointment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <Stethoscope className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{appointment.patientName}</h4>
                      <p className="text-sm text-gray-600">{appointment.specialty}</p>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {appointment.time}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          appointment.type === 'home-visit' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {appointment.type === 'home-visit' ? 'Home Visit' : 'Video Call'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => navigate(`/doctor/patients/${appointment.patientId}`)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <User className="h-4 w-4" />
                      <span>Patient</span>
                    </button>
                    <button 
                      onClick={() => startVideoCall(appointment.id)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                    >
                      <Video className="h-4 w-4" />
                      <span>Start Call</span>
                    </button>
                    <button className="text-gray-600 hover:text-gray-900 p-2">
                      <ChevronRight className="h-5 w-5" />
                    </button>
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

      {/* Recent Patients */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Patients</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {doctorAppointments.slice(0, 3).map(appointment => (
              <div key={appointment.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <img
                    src="https://images.pexels.com/photos/5452201/pexels-photo-5452201.jpeg?auto=compress&cs=tinysrgb&w=400"
                    alt={appointment.patientName}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div>
                    <h5 className="font-medium text-gray-900">{appointment.patientName}</h5>
                    <p className="text-sm text-gray-600">Last visit: {appointment.date.toLocaleDateString()}</p>
                  </div>
                </div>
                <button 
                  onClick={() => navigate(`/doctor/patients/${appointment.patientId}`)}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  View History
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const AppointmentsView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">My Appointments</h2>
        <BackButton fallbackPath="/doctor" />
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h3>
        </div>
        <div className="p-6">
          {upcomingAppointments.length > 0 ? (
            <div className="space-y-4">
              {upcomingAppointments.map(appointment => (
                <div key={appointment.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Stethoscope className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{appointment.patientName}</h4>
                        <p className="text-sm text-gray-600">{appointment.specialty}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span>{appointment.date.toLocaleDateString()}</span>
                          <span>{appointment.time}</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            appointment.status === 'scheduled' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {appointment.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => navigate(`/doctor/patients/${appointment.patientId}`)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <User className="h-4 w-4" />
                        <span>Patient</span>
                      </button>
                      <button 
                        onClick={() => startVideoCall(appointment.id)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                      >
                        <PhoneCall className="h-4 w-4" />
                        <span>Call Patient</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No upcoming appointments</p>
            </div>
          )}
        </div>
      </div>

      {/* Previous Appointments */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Previous Consultations</h3>
        </div>
        <div className="p-6">
          {completedAppointments.length > 0 ? (
            <div className="space-y-4">
              {completedAppointments.map(appointment => (
                <div key={appointment.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{appointment.patientName}</h4>
                        <p className="text-sm text-gray-600">{appointment.specialty}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span>{appointment.date.toLocaleDateString()}</span>
                          <span>{appointment.time}</span>
                          <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                            Completed
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => navigate(`/doctor/patients/${appointment.patientId}`)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <FileText className="h-4 w-4" />
                        <span>View Summary</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No completed consultations yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const PatientsView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">My Patients</h2>
        <BackButton fallbackPath="/doctor" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Patient List</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {/* Get unique patients from appointments */}
            {Array.from(new Set(doctorAppointments.map(apt => apt.patientId))).map(patientId => {
              const patientAppointments = doctorAppointments.filter(apt => apt.patientId === patientId);
              const latestAppointment = patientAppointments.sort((a, b) => b.date.getTime() - a.date.getTime())[0];
              
              return (
                <div key={patientId} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <img
                        src="https://images.pexels.com/photos/5452201/pexels-photo-5452201.jpeg?auto=compress&cs=tinysrgb&w=400"
                        alt={latestAppointment.patientName}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                      <div>
                        <h4 className="font-semibold text-gray-900">{latestAppointment.patientName}</h4>
                        <p className="text-sm text-gray-600">
                          {patientAppointments.length} consultation{patientAppointments.length !== 1 ? 's' : ''}
                        </p>
                        <p className="text-sm text-gray-500">
                          Last visit: {latestAppointment.date.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate(`/doctor/patients/${patientId}`)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <FileText className="h-4 w-4" />
                      <span>View History</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const FinancialView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Financial Dashboard</h2>
        <BackButton fallbackPath="/doctor" />
      </div>

      {/* Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{revenueData.revenue} LE</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Consultations</p>
              <p className="text-2xl font-bold text-gray-900">{revenueData.consultations}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Weekly Average</p>
              <p className="text-2xl font-bold text-gray-900">{revenueData.weeklyAverage} LE</p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Revenue Breakdown</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">Commission Structure</h4>
              <p className="text-green-800 text-sm mb-3">
                You earn 50% commission on each completed consultation
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-green-700"><strong>Patient Payment:</strong> 750 LE</p>
                  <p className="text-green-700"><strong>Your Commission:</strong> 375 LE</p>
                </div>
                <div>
                  <p className="text-green-700"><strong>Platform Fee:</strong> 375 LE</p>
                  <p className="text-green-700"><strong>Commission Rate:</strong> 50%</p>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Patient</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {completedAppointments.map(appointment => (
                    <tr key={appointment.id} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-gray-700">{appointment.date.toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-gray-700">{appointment.patientName}</td>
                      <td className="py-3 px-4 text-gray-700">
                        {appointment.type === 'home-visit' ? 'Home Visit' : 'Video Call'}
                      </td>
                      <td className="py-3 px-4 text-green-600 font-medium">375 LE</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const SettingsView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <BackButton fallbackPath="/doctor" />
      </div>

      {/* Success Message */}
      {profileSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-800 font-medium">Profile updated successfully!</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {profileError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-fade-in">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-800 font-medium">{profileError}</span>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-6">
            <img
              src={user?.avatar}
              alt={user?.name}
              className="h-20 w-20 rounded-full object-cover"
            />
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{user?.name}</h3>
              <p className="text-gray-600">{user?.email}</p>
              <div className="flex items-center space-x-2 mt-2">
                <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  Doctor
                </span>
                {user?.isVerified && (
                  <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    Verified
                  </span>
                )}
              </div>
            </div>
          </div>
          {!isEditingProfile && (
            <button
              onClick={() => setIsEditingProfile(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Edit3 className="h-4 w-4" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>
        
        <form onSubmit={handleProfileSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Professional Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={profileData.name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                  disabled={!isEditingProfile}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    !isEditingProfile ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-300'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={profileData.email}
                  onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={!isEditingProfile}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    !isEditingProfile ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-300'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  disabled={!isEditingProfile}
                  placeholder="+20 1XX XXX XXXX"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    !isEditingProfile ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-300'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Years of Experience
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={profileData.experience}
                  onChange={(e) => setProfileData(prev => ({ ...prev, experience: parseInt(e.target.value) || 0 }))}
                  disabled={!isEditingProfile}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    !isEditingProfile ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-300'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Medical Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specialty
                </label>
                <select
                  value={profileData.specialty}
                  onChange={(e) => setProfileData(prev => ({ ...prev, specialty: e.target.value }))}
                  disabled={!isEditingProfile}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    !isEditingProfile ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Specialty</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Internal Medicine">Internal Medicine</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="Gynecology">Gynecology</option>
                  <option value="Ophthalmology">Ophthalmology</option>
                  <option value="Psychiatry">Psychiatry</option>
                  <option value="Radiology">Radiology</option>
                  <option value="Anesthesiology">Anesthesiology</option>
                  <option value="Emergency Medicine">Emergency Medicine</option>
                  <option value="Family Medicine">Family Medicine</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Number
                </label>
                <input
                  type="text"
                  value={user?.license || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  License number cannot be changed. Contact support if needed.
                </p>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Professional Bio
            </label>
            <textarea
              rows={4}
              value={profileData.bio}
              onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
              disabled={!isEditingProfile}
              placeholder="Tell patients about your experience, approach to medicine, and areas of expertise..."
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                !isEditingProfile ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-300'
              }`}
            />
          </div>

          {/* Action Buttons */}
          {isEditingProfile && (
            <div className="flex space-x-4 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={authLoading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2 font-medium"
              >
                {authLoading && <Loader className="h-4 w-4 animate-spin" />}
                {!authLoading && <Save className="h-4 w-4" />}
                <span>{authLoading ? 'Saving...' : 'Save Changes'}</span>
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={authLoading}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none flex items-center space-x-2 font-medium"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          )}
        </form>
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
              <div className="bg-green-600 p-2 rounded-lg">
                <Stethoscope className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">TeleMedCare - Doctor</h1>
                <p className="text-sm text-gray-600">{user?.specialty}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="text-gray-600 hover:text-gray-900 p-2 relative"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                <NotificationDropdown 
                  isOpen={showNotifications}
                  onClose={() => setShowNotifications(false)}
                />
              </div>
              <button 
                onClick={() => navigate('/doctor/settings')}
                className="text-gray-600 hover:text-gray-900 p-2"
              >
                <Settings className="h-5 w-5" />
              </button>
              <div className="relative group">
                <button 
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-red-600 p-2 transition-colors duration-200 flex items-center space-x-2"
                  title="Sign out of your account"
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
                    (item.href === '/doctor' && location.pathname === '/doctor');
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-green-50 text-green-700 border border-green-200'
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
              <Route path="/appointments" element={<AppointmentsView />} />
              <Route path="/patients" element={<PatientsView />} />
              <Route path="/consultations" element={<DashboardOverview />} />
              <Route path="/financial" element={<FinancialView />} />
              <Route path="/settings" element={<SettingsView />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;