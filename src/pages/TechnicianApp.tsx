import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAppointments } from '../contexts/AppointmentContext';
import BackButton from '../components/BackButton';
import { 
  MapPin, 
  Navigation, 
  Activity, 
  Bluetooth, 
  Usb, 
  Heart,
  Thermometer,
  Zap,
  Clock,
  User,
  LogOut,
  Bell,
  Settings,
  CheckCircle,
  PlayCircle,
  StopCircle,
  Wifi
} from 'lucide-react';
import DeviceConnector from '../components/DeviceConnector';

const TechnicianApp: React.FC = () => {
  const { user, logout } = useAuth();
  const { appointments, getAppointmentsByUser, updateAppointment } = useAppointments();
  const [selectedAppointment, setSelectedAppointment] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);

  const technicianAppointments = getAppointmentsByUser(user?.id || '3', 'technician')
    .filter(apt => apt.status === 'scheduled');

  const startSession = (appointmentId: string) => {
    setSelectedAppointment(appointmentId);
    setSessionActive(true);
    updateAppointment(appointmentId, { status: 'in-progress' });
  };

  const endSession = () => {
    if (selectedAppointment) {
      updateAppointment(selectedAppointment, { status: 'completed' });
    }
    setSessionActive(false);
    setSelectedAppointment(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-600 p-2 rounded-lg">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">TeleMedCare - Technician</h1>
                <p className="text-sm text-gray-600">Field Operations</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-green-100 px-3 py-1 rounded-full">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-800">On Duty</span>
              </div>
              <button className="text-gray-600 hover:text-gray-900 p-2">
                <Bell className="h-5 w-5" />
              </button>
              <button className="text-gray-600 hover:text-gray-900 p-2">
                <Settings className="h-5 w-5" />
              </button>
              <div className="relative group">
                <button 
                  onClick={logout}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Assigned Appointments */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Assigned Appointments</h3>
            </div>
            <div className="p-6">
              {technicianAppointments.length > 0 ? (
                <div className="space-y-4">
                  {technicianAppointments.map(appointment => (
                    <div key={appointment.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{appointment.patientName}</h4>
                          <p className="text-sm text-gray-600">Dr. {appointment.doctorName}</p>
                        </div>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {appointment.time}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-3">
                        <MapPin className="h-4 w-4" />
                        <span>{appointment.location}</span>
                      </div>
                      
                      <div className="flex space-x-3">
                        <button className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                          <Navigation className="h-4 w-4" />
                          <span>Navigate</span>
                        </button>
                        <button 
                          onClick={() => startSession(appointment.id)}
                          className="flex items-center space-x-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          <PlayCircle className="h-4 w-4" />
                          <span>Start Session</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No appointments assigned today</p>
                </div>
              )}
            </div>
          </div>

          {/* Device Management */}
          <div className="space-y-6">
            {/* Session Control */}
            {sessionActive && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-green-900">Active Session</h3>
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-800">Live</span>
                  </div>
                </div>
                <p className="text-green-700 mb-4">
                  Patient: {technicianAppointments.find(apt => apt.id === selectedAppointment)?.patientName}
                </p>
                <button 
                  onClick={endSession}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                >
                  <StopCircle className="h-4 w-4" />
                  <span>End Session</span>
                </button>
              </div>
            )}

            {/* Device Connector */}
            <DeviceConnector />

            {/* Connected Devices Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Device Status</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {[
                    { name: 'Blood Pressure Monitor', status: 'connected', icon: Heart },
                    { name: 'Pulse Oximeter', status: 'connected', icon: Activity },
                    { name: 'Digital Thermometer', status: 'disconnected', icon: Thermometer },
                    { name: 'Digital Stethoscope', status: 'connected', icon: Zap }
                  ].map((device, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <device.icon className="h-5 w-5 text-gray-600" />
                        <span className="font-medium text-gray-900">{device.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`h-2 w-2 rounded-full ${
                          device.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <span className={`text-sm font-medium ${
                          device.status === 'connected' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {device.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechnicianApp;