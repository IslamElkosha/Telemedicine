import React, { useState } from 'react';
import { useTechnician } from '../contexts/TechnicianContext';
import BackButton from './BackButton';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Navigation, 
  Play, 
  CheckCircle, 
  AlertTriangle,
  Filter,
  Search,
  Route,
  Stethoscope,
  ExternalLink,
  MessageCircle,
  FileText,
  Star,
  DollarSign
} from 'lucide-react';

const TechnicianAppointments: React.FC = () => {
  const { 
    appointments, 
    updateAppointmentStatus, 
    addAppointmentNotes, 
    loading 
  } = useTechnician();
  
  const [filter, setFilter] = useState<'all' | 'assigned' | 'en-route' | 'in-progress' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [showLocationDetails, setShowLocationDetails] = useState<string | null>(null);

  const filteredAppointments = appointments.filter(appointment => {
    const matchesFilter = filter === 'all' || appointment.status === filter;
    const matchesSearch = appointment.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.patientAddress.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const handleStatusUpdate = async (appointmentId: string, newStatus: any) => {
    const result = await updateAppointmentStatus(appointmentId, newStatus);
    if (!result.success) {
      alert(result.error || 'Failed to update appointment status');
    }
  };

  const handleCompleteAppointment = async (appointmentId: string) => {
    if (completionNotes.trim()) {
      await addAppointmentNotes(appointmentId, completionNotes);
    }
    await handleStatusUpdate(appointmentId, 'completed');
    setSelectedAppointment(null);
    setCompletionNotes('');
  };

  const openGoogleMaps = (address: string) => {
    const mapsUrl = `https://maps.google.com/maps?q=${encodeURIComponent(address)}`;
    window.open(mapsUrl, '_blank');
  };

  const openWaze = (address: string) => {
    const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(address)}`;
    window.open(wazeUrl, '_blank');
  };

  const callPatient = (phoneNumber: string) => {
    window.open(`tel:${phoneNumber}`, '_self');
  };

  const sendSMS = (phoneNumber: string, message: string) => {
    const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
    window.open(smsUrl, '_self');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'bg-blue-100 text-blue-800';
      case 'en-route':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'urgent':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getNextAction = (appointment: any) => {
    switch (appointment.status) {
      case 'assigned':
        return {
          label: 'Start Journey',
          action: () => handleStatusUpdate(appointment.id, 'en-route'),
          color: 'bg-blue-600 hover:bg-blue-700',
          icon: Route
        };
      case 'en-route':
        return {
          label: 'Arrive & Start',
          action: () => handleStatusUpdate(appointment.id, 'in-progress'),
          color: 'bg-green-600 hover:bg-green-700',
          icon: Play
        };
      case 'in-progress':
        return {
          label: 'Complete Visit',
          action: () => setSelectedAppointment(appointment.id),
          color: 'bg-purple-600 hover:bg-purple-700',
          icon: CheckCircle
        };
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">My Appointments</h2>
        <BackButton fallbackPath="/technician" />
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search patients, doctors, or addresses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-600" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Appointments</option>
              <option value="assigned">Assigned</option>
              <option value="en-route">En Route</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Appointments ({filteredAppointments.length})
          </h3>
        </div>
        <div className="p-6">
          {filteredAppointments.length > 0 ? (
            <div className="space-y-4">
              {filteredAppointments.map(appointment => {
                const nextAction = getNextAction(appointment);
                
                return (
                  <div key={appointment.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        <div className="bg-purple-100 p-3 rounded-lg">
                          <Stethoscope className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">{appointment.patientName}</h4>
                          <p className="text-gray-600">Dr. {appointment.doctorName} - {appointment.specialty}</p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {appointment.scheduledDate.toLocaleDateString()}
                            </span>
                            <span className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {appointment.scheduledTime}
                            </span>
                            <span className="flex items-center">
                              <User className="h-4 w-4 mr-1" />
                              {appointment.estimatedDuration} min
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(appointment.priority)}`}>
                          {appointment.priority}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
                          {appointment.status.replace('-', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Appointment Details */}
                    <div className="mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <h5 className="font-medium text-purple-900 mb-1">Appointment Info</h5>
                          <div className="text-sm text-purple-800 space-y-1">
                            <p><strong>Duration:</strong> {appointment.estimatedDuration} minutes</p>
                            <p><strong>Payment:</strong> {appointment.paymentStatus === 'paid' ? '✓ Paid' : 'Pending'}</p>
                            <p><strong>Earnings:</strong> {appointment.technicianEarnings} LE</p>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <h5 className="font-medium text-gray-900 mb-1">Doctor Info</h5>
                          <div className="text-sm text-gray-700 space-y-1">
                            <p><strong>Name:</strong> Dr. {appointment.doctorName}</p>
                            <p><strong>Specialty:</strong> {appointment.specialty}</p>
                            <p><strong>Contact:</strong> Available via platform</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Required Devices */}
                    <div className="mb-4">
                      <h5 className="font-medium text-gray-900 mb-2">Required Devices</h5>
                      <div className="flex flex-wrap gap-2">
                        {appointment.requiredDevices.map((device, index) => (
                          <span key={index} className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">
                            {device}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    {appointment.notes && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <h5 className="font-medium text-blue-900 mb-1">Special Instructions</h5>
                        <p className="text-blue-800 text-sm">{appointment.notes}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-3">
                        <button 
                          onClick={() => openGoogleMaps(appointment.patientAddress)}
                          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Navigation className="h-4 w-4" />
                          <span>Navigate</span>
                        </button>
                        <button 
                          onClick={() => callPatient(appointment.patientPhone)}
                          className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Phone className="h-4 w-4" />
                          <span>Call Patient</span>
                        </button>
                        <button 
                          onClick={() => sendSMS(appointment.patientPhone, `Hi ${appointment.patientName}, I'm on my way to your appointment.`)}
                          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span>Send SMS</span>
                        </button>
                      </div>
                      
                      {nextAction && (
                        <button
                          onClick={nextAction.action}
                          disabled={loading}
                          className={`flex items-center space-x-2 text-white px-6 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 ${nextAction.color}`}
                        >
                          <nextAction.icon className="h-4 w-4" />
                          <span>{nextAction.label}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
              <p className="text-gray-600">
                {filter === 'all' 
                  ? "You don't have any appointments yet"
                  : `No ${filter.replace('-', ' ')} appointments`
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Completion Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Complete Appointment</h3>
            
            {/* Appointment Summary */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium text-gray-900 mb-2">Visit Summary</h4>
              <div className="text-sm text-gray-700 space-y-1">
                <p><strong>Patient:</strong> {appointments.find(apt => apt.id === selectedAppointment)?.patientName}</p>
                <p><strong>Doctor:</strong> Dr. {appointments.find(apt => apt.id === selectedAppointment)?.doctorName}</p>
                <p><strong>Duration:</strong> {appointments.find(apt => apt.id === selectedAppointment)?.estimatedDuration} minutes</p>
                <p><strong>Earnings:</strong> {appointments.find(apt => apt.id === selectedAppointment)?.technicianEarnings} LE</p>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Completion Notes (Optional)
              </label>
              <textarea
                rows={4}
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Add any notes about the visit, device readings, or patient condition..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => handleCompleteAppointment(selectedAppointment)}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Complete Visit</span>
              </button>
              <button
                onClick={() => {
                  setSelectedAppointment(null);
                  setCompletionNotes('');
                }}
                className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianAppointments;