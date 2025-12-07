import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppointments } from '../contexts/AppointmentContext';
import { useNotifications } from '../contexts/NotificationContext';
import AddressSelector from '../components/AddressSelector';
import { egyptianGovernorates } from '../data/egyptianLocations';
import NotificationDropdown from '../components/NotificationDropdown';
import BackButton from '../components/BackButton';
import { 
  Calendar, 
  Video, 
  FileText, 
  CreditCard, 
  MapPin, 
  Clock, 
  User,
  Bell,
  Settings,
  LogOut,
  Plus,
  Activity,
  Heart,
  Thermometer,
  CheckCircle,
  AlertCircle,
  Loader,
  X,
  Monitor
} from 'lucide-react';
import DeviceReadings from '../components/DeviceReadings';
import HealthMetrics from '../components/HealthMetrics';
import RecentLabResults from '../components/RecentLabResults';

const PatientDashboard: React.FC = () => {
  const { user, logout, updateProfile, loading } = useAuth();
  const { appointments, getAppointmentsByUser } = useAppointments();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [joiningCall, setJoiningCall] = useState<string | null>(null);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    dateOfBirth: user?.dateOfBirth || '',
    governorate: user?.governorate || '',
    city: user?.city || '',
    address: user?.address || '',
    medicalHistory: user?.medicalHistory || '',
    emergencyContact: user?.emergencyContact || { name: '', phone: '', relationship: '' }
  });
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const userAppointments = getAppointmentsByUser(user?.id || '1', 'patient');
  const upcomingAppointments = userAppointments.filter(apt => apt.status === 'scheduled');
  const completedAppointments = userAppointments.filter(apt => apt.status === 'completed');

  // Update profile data when user changes
  React.useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        dateOfBirth: user.dateOfBirth || '',
        governorate: user.governorate || '',
        city: user.city || '',
        address: user.address || '',
        medicalHistory: user.medicalHistory || '',
        emergencyContact: user.emergencyContact || { name: '', phone: '', relationship: '' }
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
      setIsEditing(false);
      setTimeout(() => setProfileSuccess(false), 3000);
    } else {
      setProfileError(result.error?.message || 'Failed to update profile');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setProfileError(null);
    setProfileSuccess(false);
    // Reset form data to original user data
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        dateOfBirth: user.dateOfBirth || '',
        governorate: user.governorate || '',
        city: user.city || '',
        address: user.address || '',
        medicalHistory: user.medicalHistory || '',
        emergencyContact: user.emergencyContact || { name: '', phone: '', relationship: '' }
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleEmergencyContactChange = (field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      emergencyContact: { ...prev.emergencyContact, [field]: value }
    }));
  };

  const handleLogout = async () => {
    const confirmLogout = window.confirm(
      'Are you sure you want to sign out?'
    );

    if (!confirmLogout) return;

    setIsLoggingOut(true);

    try {
      await logout();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      await logout();
      navigate('/', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getSelectedGovernorate = () => {
    return egyptianGovernorates.find(gov => gov.id === profileData.governorate);
  };

  const getSelectedCity = () => {
    const governorate = getSelectedGovernorate();
    return governorate?.cities.find(city => city.id === profileData.city);
  };

  const canJoinCall = (appointment: any) => {
    const now = new Date();
    const appointmentDateTime = new Date(appointment.date);
    const [hours, minutes] = appointment.time.split(':').map(Number);
    appointmentDateTime.setHours(hours, minutes, 0, 0);
    
    // Allow joining 10 minutes before appointment time
    const joinTime = new Date(appointmentDateTime.getTime() - 10 * 60 * 1000);
    
    return now >= joinTime && appointment.status === 'scheduled';
  };

  const getCallStatus = (appointment: any) => {
    const now = new Date();
    const appointmentDateTime = new Date(appointment.date);
    const [hours, minutes] = appointment.time.split(':').map(Number);
    appointmentDateTime.setHours(hours, minutes, 0, 0);
    
    const joinTime = new Date(appointmentDateTime.getTime() - 10 * 60 * 1000);
    const endTime = new Date(appointmentDateTime.getTime() + 60 * 60 * 1000); // 1 hour after
    
    if (now < joinTime) {
      const minutesUntilJoin = Math.ceil((joinTime.getTime() - now.getTime()) / (1000 * 60));
      return { status: 'waiting', message: `Available in ${minutesUntilJoin} minutes` };
    } else if (now >= joinTime && now <= endTime) {
      return { status: 'available', message: 'Ready to join' };
    } else {
      return { status: 'expired', message: 'Consultation time has passed' };
    }
  };

  const handleJoinCall = async (appointmentId: string) => {
    setJoiningCall(appointmentId);
    
    try {
      // Simulate connection check
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate potential connection error (10% chance)
      if (Math.random() < 0.1) {
        throw new Error('Connection failed. Please check your internet connection and try again.');
      }
      
      // Navigate to video call
      navigate(`/video-call/${appointmentId}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to join call');
    } finally {
      setJoiningCall(null);
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/patient', icon: Activity, key: 'dashboard' },
    { name: 'Appointments', href: '/patient/appointments', icon: Calendar, key: 'appointments' },
    { name: 'Medical Devices', href: '/patient/devices', icon: Monitor, key: 'devices' },
    { name: 'Medical Records', href: '/patient/medical-records', icon: FileText, key: 'medical-records' },
    { name: 'Consultations', href: '/patient/consultations', icon: Video, key: 'consultations' },
    { name: 'Reports', href: '/patient/reports', icon: FileText, key: 'reports' },
    { name: 'Profile', href: '/patient/profile', icon: User, key: 'profile' },
  ];

  const DashboardOverview = () => (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Welcome back, {user?.name}!</h2>
        <p className="text-blue-100">Your next appointment is in 2 days</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Upcoming</p>
              <p className="text-2xl font-bold text-gray-900">{upcomingAppointments.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Video className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Consultations</p>
              <p className="text-2xl font-bold text-gray-900">{completedAppointments.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Reports</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h3>
            <Link 
              to="/book-appointment"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Book New</span>
            </Link>
          </div>
        </div>
        <div className="p-6">
          {upcomingAppointments.length > 0 ? (
            <div className="space-y-4">
              {upcomingAppointments.map(appointment => (
                <div key={appointment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Heart className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{appointment.doctorName}</h4>
                      <p className="text-sm text-gray-600">{appointment.specialty}</p>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {appointment.date.toLocaleDateString()}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {appointment.time}
                        </span>
                        <span className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {appointment.type === 'home-visit' ? 'Home Visit' : 'Video Call'}
                        </span>
                        {appointment.type === 'home-visit' && appointment.paymentStatus && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            appointment.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                            appointment.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {appointment.paymentStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {appointment.type === 'home-visit' && appointment.paymentStatus === 'pending' ? (
                      <button 
                        onClick={() => navigate(`/payment?appointmentId=${appointment.id}`)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Pay Now
                      </button>
                    ) : (
                      <div className="flex flex-col items-end space-y-2">
                        {(() => {
                          const callStatus = getCallStatus(appointment);
                          const canJoin = canJoinCall(appointment);
                          
                          return (
                            <>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                callStatus.status === 'available' ? 'bg-green-100 text-green-800' :
                                callStatus.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {callStatus.message}
                              </span>
                              <button 
                                onClick={() => handleJoinCall(appointment.id)}
                                disabled={!canJoin || joiningCall === appointment.id}
                                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                                  canJoin 
                                    ? 'bg-green-600 text-white hover:bg-green-700' 
                                    : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                }`}
                              >
                                {joiningCall === appointment.id ? (
                                  <>
                                    <Loader className="h-4 w-4 animate-spin" />
                                    <span>Connecting...</span>
                                  </>
                                ) : (
                                  <>
                                    <Video className="h-4 w-4" />
                                    <span>Join Call</span>
                                  </>
                                )}
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    )}
                    <button className="text-gray-600 hover:text-gray-900 px-4 py-2 border border-gray-300 rounded-lg">
                      Reschedule
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No upcoming appointments</p>
              <Link 
                to="/book-appointment"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Book your first consultation
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent Device Readings */}
      <DeviceReadings />

      {/* Health Metrics */}
      <HealthMetrics />

      {/* Recent Lab Results */}
      <RecentLabResults />
    </div>
  );

  const AppointmentsView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">My Appointments</h2>
        <Link 
          to="/book-appointment"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Book New</span>
        </Link>
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Upcoming</h3>
        </div>
        <div className="p-6">
          {upcomingAppointments.map(appointment => (
            <div key={appointment.id} className="border border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">{appointment.doctorName}</h4>
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
                <div className="flex space-x-2">
                  <div className="flex flex-col items-end space-y-2">
                    {(() => {
                      const callStatus = getCallStatus(appointment);
                      const canJoin = canJoinCall(appointment);
                      
                      return (
                        <>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            callStatus.status === 'available' ? 'bg-green-100 text-green-800' :
                            callStatus.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {callStatus.message}
                          </span>
                          <button 
                            onClick={() => handleJoinCall(appointment.id)}
                            disabled={!canJoin || joiningCall === appointment.id}
                            className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                              canJoin 
                                ? 'bg-green-600 text-white hover:bg-green-700' 
                                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                            }`}
                          >
                            {joiningCall === appointment.id ? (
                              <>
                                <Loader className="h-4 w-4 animate-spin" />
                                <span>Connecting...</span>
                              </>
                            ) : (
                              <>
                                <Video className="h-4 w-4" />
                                <span>Join Call</span>
                              </>
                            )}
                          </button>
                        </>
                      );
                    })()}
                  </div>
                  <button className="text-gray-600 hover:text-gray-900 px-4 py-2 border border-gray-300 rounded-lg">
                    Reschedule
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Past Appointments */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Past Consultations</h3>
        </div>
        <div className="p-6">
          {completedAppointments.map(appointment => (
            <div key={appointment.id} className="border border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">{appointment.doctorName}</h4>
                  <p className="text-sm text-gray-600">{appointment.specialty}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span>{appointment.date.toLocaleDateString()}</span>
                    <span>{appointment.time}</span>
                    <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                      Completed
                    </span>
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-700 px-4 py-2 border border-blue-600 rounded-lg">
                  View Report
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const ProfileView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            Edit Profile
          </button>
        )}
      </div>

      {/* Success Message */}
      {profileSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-800 font-medium">Profile updated successfully!</span>
          </div>
          <p className="text-green-700 text-sm mt-1">Your changes have been saved and will be reflected across the platform.</p>
        </div>
      )}

      {/* Error Message */}
      {profileError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-fade-in">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-800 font-medium">{profileError}</span>
          </div>
          <p className="text-red-700 text-sm mt-1">Please check your information and try again.</p>
        </div>
      )}
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-6 mb-6">
          <img
            src={user?.avatar}
            alt={user?.name}
            className="h-20 w-20 rounded-full object-cover"
          />
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{user?.name}</h3>
            <p className="text-gray-600">{user?.email}</p>
            <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mt-2">
              Patient
            </span>
            {user?.isVerified && (
              <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium mt-2 ml-2">
                Verified
              </span>
            )}
          </div>
        </div>
        
        <form onSubmit={handleProfileSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={profileData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    !isEditing ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-300'
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
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    !isEditing ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-300'
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
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  disabled={!isEditing}
                  placeholder="+20 1XX XXX XXXX"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    !isEditing ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-300'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={profileData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    !isEditing ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-300'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h4>
            {isEditing ? (
              <div className="space-y-4">
                <AddressSelector
                  selectedGovernorate={profileData.governorate}
                  selectedCity={profileData.city}
                  onGovernorateChange={(governorateId) => handleInputChange('governorate', governorateId)}
                  onCityChange={(cityId) => handleInputChange('city', cityId)}
                  disabled={loading}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Detailed Address
                  </label>
                  <textarea
                    rows={3}
                    value={profileData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Street address, building number, apartment, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg">
                {profileData.governorate && profileData.city ? (
                  <div>
                    <p className="font-medium text-gray-900">
                      {getSelectedCity()?.name}, {getSelectedGovernorate()?.name}
                    </p>
                    {profileData.address && (
                      <p className="text-gray-600 mt-1">{profileData.address}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">No address information provided</p>
                )}
              </div>
            )}
          </div>

          {/* Emergency Contact */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={profileData.emergencyContact.name}
                  onChange={(e) => handleEmergencyContactChange('name', e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    !isEditing ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-300'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profileData.emergencyContact.phone}
                  onChange={(e) => handleEmergencyContactChange('phone', e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    !isEditing ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-300'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship
                </label>
                <select
                  value={profileData.emergencyContact.relationship}
                  onChange={(e) => handleEmergencyContactChange('relationship', e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    !isEditing ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select relationship</option>
                  <option value="spouse">Spouse</option>
                  <option value="parent">Parent</option>
                  <option value="child">Child</option>
                  <option value="sibling">Sibling</option>
                  <option value="friend">Friend</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Medical History */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Medical History</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Medical History & Allergies
              </label>
              <textarea
                rows={4}
                value={profileData.medicalHistory}
                onChange={(e) => handleInputChange('medicalHistory', e.target.value)}
                disabled={!isEditing}
                placeholder="Any relevant medical history, allergies, current medications, or chronic conditions"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  !isEditing ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-300'
                }`}
              />
            </div>
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex space-x-4 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2 font-medium"
              >
                {loading && <Loader className="h-4 w-4 animate-spin" />}
                {!loading && <CheckCircle className="h-4 w-4" />}
                <span>{loading ? 'Saving...' : 'Save Changes'}</span>
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={loading}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none flex items-center space-x-2 font-medium"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          )}

          {/* Exit Profile Button */}
          {!isEditing && (
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                onClick={() => navigate('/patient')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 flex items-center space-x-2 font-medium"
              >
                <Activity className="h-4 w-4" />
                Back to Dashboard
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );

  const ProfileViewOld = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-6 mb-6">
          <img
            src={user?.avatar}
            alt={user?.name}
            className="h-20 w-20 rounded-full object-cover"
          />
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{user?.name}</h3>
            <p className="text-gray-600">{user?.email}</p>
            <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mt-2">
              Patient
            </span>
          </div>
        </div>
        
        <form className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                defaultValue={user?.name}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                defaultValue={user?.email}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                placeholder="+1 (555) 123-4567"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              rows={3}
              placeholder="Enter your full address"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Medical History</label>
            <textarea
              rows={4}
              placeholder="Any relevant medical history, allergies, or current medications"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Update Profile
          </button>
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
              <div className="bg-blue-600 p-2 rounded-lg">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">TeleMedCare - Patient</h1>
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
              <button className="text-gray-600 hover:text-gray-900 p-2">
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
                
                {/* Tooltip */}
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
                    (item.href === '/patient' && location.pathname === '/patient');
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
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
              <Route path="/medical-records" element={<DashboardOverview />} />
              <Route path="/consultations" element={<DashboardOverview />} />
              <Route path="/reports" element={<DashboardOverview />} />
              <Route path="/profile" element={<ProfileView />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;