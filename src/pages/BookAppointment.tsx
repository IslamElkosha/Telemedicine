import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppointments } from '../contexts/AppointmentContext';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Clock, MapPin, User, CheckCircle, CreditCard, Loader } from 'lucide-react';
import BackButton from '../components/BackButton';
import { supabase } from '../lib/supabase';

interface Doctor {
  id: string;
  specialty: string;
  licenseNo: string;
  fullName: string;
  email: string;
}

const BookAppointment: React.FC = () => {
  const navigate = useNavigate();
  const { addAppointment } = useAppointments();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    specialty: '',
    doctor: '',
    doctorId: '',
    date: '',
    time: '',
    type: 'home-visit',
    location: '',
    symptoms: ''
  });
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>([]);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const { data: doctorsData, error } = await supabase
        .from('doctors')
        .select('id, specialty, licenseNo');

      if (error) {
        console.error('Error fetching doctors:', error);
        throw error;
      }

      if (doctorsData && doctorsData.length > 0) {
        const doctorIds = doctorsData.map(d => d.id);

        const { data: usersData } = await supabase
          .from('users')
          .select('id, email')
          .in('id', doctorIds);

        const { data: profilesData } = await supabase
          .from('user_profiles')
          .select('userId, fullName')
          .in('userId', doctorIds);

        const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);
        const profilesMap = new Map(profilesData?.map(p => [p.userId, p]) || []);

        const doctorsList: Doctor[] = doctorsData.map((doc) => ({
          id: doc.id,
          specialty: doc.specialty || 'General',
          licenseNo: doc.licenseNo || '',
          fullName: profilesMap.get(doc.id)?.fullName || 'Unknown Doctor',
          email: usersMap.get(doc.id)?.email || ''
        }));

        setDoctors(doctorsList);

        const uniqueSpecialties = [...new Set(doctorsList.map(d => d.specialty).filter(Boolean))];
        setSpecialties(uniqueSpecialties.length > 0 ? uniqueSpecialties : ['General Medicine']);
      } else {
        setDoctors([]);
        setSpecialties(['Cardiology', 'Dermatology', 'Neurology', 'Pediatrics']);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
      setDoctors([]);
      setSpecialties(['Cardiology', 'Dermatology', 'Neurology', 'Pediatrics']);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const getDoctorsBySpecialty = (specialty: string): Doctor[] => {
    return doctors.filter(doc => doc.specialty === specialty);
  };

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
  ];

  const handleSubmit = async () => {
    try {
      const appointmentData = {
        patientId: user?.id || '1',
        patientName: user?.name || 'John Smith',
        doctorId: formData.doctorId || '2',
        doctorName: formData.doctor,
        technicianId: undefined,
        technicianName: undefined,
        specialty: formData.specialty,
        date: new Date(formData.date),
        time: formData.time,
        location: formData.type === 'home-visit' ? formData.location : 'Video Call',
        status: 'scheduled' as const,
        type: formData.type as 'home-visit' | 'video-only',
        paymentStatus: formData.type === 'home-visit' ? 'pending' as const : undefined,
        notes: formData.symptoms
      };

      const newAppointmentId = await addAppointment(appointmentData);

      if (formData.type === 'home-visit') {
        navigate(`/payment?appointmentId=${newAppointmentId}`);
      } else {
        setStep(4);
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Failed to create appointment. Please try again.');
    }
  };

  const isStepComplete = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        return formData.specialty && formData.doctor;
      case 2:
        return formData.date && formData.time;
      case 3:
        return formData.type === 'video-only' || formData.location;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <BackButton fallbackPath="/patient" />
          <h1 className="text-xl font-bold text-gray-900">Book Appointment</h1>
          <div className="w-20"></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step > stepNumber ? 'bg-green-500 text-white' :
                  step === stepNumber ? 'bg-blue-600 text-white' :
                  'bg-gray-300 text-gray-600'
                }`}>
                  {step > stepNumber ? <CheckCircle className="h-6 w-6" /> : stepNumber}
                </div>
                {stepNumber < 4 && (
                  <div className={`w-16 h-1 mx-4 ${
                    step > stepNumber ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-4">
            <div className="flex space-x-16 text-sm text-gray-600">
              <span className={step === 1 ? 'font-semibold text-blue-600' : ''}>Select Doctor</span>
              <span className={step === 2 ? 'font-semibold text-blue-600' : ''}>Date & Time</span>
              <span className={step === 3 ? 'font-semibold text-blue-600' : ''}>Details</span>
              <span className={step === 4 ? 'font-semibold text-green-600' : ''}>Confirmation</span>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Select Specialty & Doctor</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medical Specialty
                </label>
                <select
                  value={formData.specialty}
                  onChange={(e) => setFormData(prev => ({ ...prev, specialty: e.target.value, doctor: '' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a specialty</option>
                  {specialties.map(specialty => (
                    <option key={specialty} value={specialty}>{specialty}</option>
                  ))}
                </select>
              </div>

              {formData.specialty && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Doctor
                  </label>
                  {loadingDoctors ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="ml-2 text-gray-600">Loading doctors...</span>
                    </div>
                  ) : getDoctorsBySpecialty(formData.specialty).length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No doctors available for {formData.specialty}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {getDoctorsBySpecialty(formData.specialty).map(doctor => (
                        <div
                          key={doctor.id}
                          onClick={() => setFormData(prev => ({ ...prev, doctor: doctor.fullName, doctorId: doctor.id }))}
                          className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                            formData.doctorId === doctor.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <img
                              src="https://images.pexels.com/photos/5452201/pexels-photo-5452201.jpeg?auto=compress&cs=tinysrgb&w=400"
                              alt={doctor.fullName}
                              className="h-12 w-12 rounded-full object-cover"
                            />
                            <div>
                              <h3 className="font-semibold text-gray-900">{doctor.fullName}</h3>
                              <p className="text-sm text-gray-600">{doctor.specialty}</p>
                              <p className="text-xs text-gray-500">License: {doctor.licenseNo}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Select Date & Time</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Available Time Slots
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map(time => (
                      <button
                        key={time}
                        onClick={() => setFormData(prev => ({ ...prev, time }))}
                        className={`p-2 text-sm rounded-lg border transition-colors ${
                          formData.time === time
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Consultation Details</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Consultation Type
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    onClick={() => setFormData(prev => ({ ...prev, type: 'home-visit' }))}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      formData.type === 'home-visit'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <h3 className="font-semibold text-gray-900 mb-2">Home Visit</h3>
                    <p className="text-sm text-gray-600">Technician will visit your location with medical equipment</p>
                  </div>
                  
                  <div
                    onClick={() => setFormData(prev => ({ ...prev, type: 'video-only' }))}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      formData.type === 'video-only'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <h3 className="font-semibold text-gray-900 mb-2">Video Only</h3>
                    <p className="text-sm text-gray-600">Video consultation without physical examination</p>
                  </div>
                </div>
              </div>

              {formData.type === 'home-visit' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Home Address
                  </label>
                  <textarea
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your complete address..."
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Symptoms or Reason for Consultation
                </label>
                <textarea
                  value={formData.symptoms}
                  onChange={(e) => setFormData(prev => ({ ...prev, symptoms: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe your symptoms or reason for consultation..."
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center space-y-6">
              <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Appointment Confirmed!</h2>
                <p className="text-gray-600">Your appointment has been successfully booked</p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg text-left max-w-md mx-auto">
                <h3 className="font-semibold text-gray-900 mb-4">Appointment Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Doctor:</span>
                    <span className="font-medium">{formData.doctor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Specialty:</span>
                    <span className="font-medium">{formData.specialty}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">{new Date(formData.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium">{formData.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">
                      {formData.type === 'home-visit' ? 'Home Visit' : 'Video Call'}
                    </span>
                  </div>
                  {formData.type === 'home-visit' && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fee:</span>
                      <span className="font-medium text-blue-600">750 LE</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {formData.type === 'home-visit' ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-900">Payment Required</span>
                    </div>
                    <p className="text-blue-800 text-sm">
                      A payment of 750 LE is required for home visit appointments. 
                      You will be redirected to complete the payment process.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={() => navigate('/patient')}
                      className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Return to Dashboard
                    </button>
                    <button
                      onClick={() => {
                        setStep(1);
                        setFormData({
                          specialty: '',
                          doctor: '',
                          date: '',
                          time: '',
                          type: 'home-visit',
                          location: '',
                          symptoms: ''
                        });
                      }}
                      className="w-full text-gray-600 hover:text-gray-900 py-2 px-6 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      Book Another Appointment
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          {step < 4 && (
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => setStep(step - 1)}
                disabled={step === 1}
                className="px-6 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <button
                onClick={() => {
                  if (step === 3) {
                    handleSubmit();
                  } else {
                    setStep(step + 1);
                  }
                }}
                disabled={!isStepComplete(step)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {step === 3 ? (formData.type === 'home-visit' ? 'Proceed to Payment' : 'Book Appointment') : 'Next'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookAppointment;