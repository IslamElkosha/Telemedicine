import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TechnicianProvider } from './contexts/TechnicianContext';
import { AppointmentProvider } from './contexts/AppointmentContext';
import { NotificationProvider } from './contexts/NotificationContext';
import LandingPage from './pages/LandingPage';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import TechnicianPortal from './pages/TechnicianPortal';
import AdminDashboard from './pages/AdminDashboard';
import VideoCall from './pages/VideoCall';
import BookAppointment from './pages/BookAppointment';
import PrivateHospitalDashboard from './pages/PrivateHospitalDashboard';
import FreelanceTechnicianDashboard from './pages/FreelanceTechnicianDashboard';
import NotificationsPage from './pages/NotificationsPage';
import PaymentPage from './pages/PaymentPage';
import MedicalRecordsPage from './pages/MedicalRecordsPage';
import PatientDevicesPage from './pages/PatientDevicesPage';
import DiagnosticsPage from './pages/DiagnosticsPage';
import PatientWithingsDataPage from './pages/PatientWithingsDataPage';
import WithingsCallbackPage from './pages/WithingsCallbackPage';

function App() {
  return (
    <AuthProvider>
      <TechnicianProvider>
        <NotificationProvider>
          <AppointmentProvider>
            <Router>
              <div className="min-h-screen bg-gray-50">
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/patient/*" element={<PatientDashboard />} />
                  <Route path="/doctor/*" element={<DoctorDashboard />} />
                  <Route path="/technician/*" element={<TechnicianPortal />} />
                  <Route path="/admin/*" element={<AdminDashboard />} />
                  <Route path="/hospital/*" element={<PrivateHospitalDashboard />} />
                  <Route path="/freelance-tech/*" element={<FreelanceTechnicianDashboard />} />
                  <Route path="/video-call/:appointmentId" element={<VideoCall />} />
                  <Route path="/book-appointment" element={<BookAppointment />} />
                  <Route path="/patient/notifications" element={<NotificationsPage />} />
                  <Route path="/payment" element={<PaymentPage />} />
                  <Route path="/patient/medical-records" element={<MedicalRecordsPage />} />
                  <Route path="/patient/devices" element={<PatientDevicesPage />} />
                  <Route path="/diagnostics" element={<DiagnosticsPage />} />
                  <Route path="/patient/:patientId/withings" element={<PatientWithingsDataPage />} />
                  <Route path="/doctor/patient/:patientId/withings" element={<PatientWithingsDataPage />} />
                  <Route path="/technician/patient/:patientId/withings" element={<PatientWithingsDataPage />} />
                  <Route path="/withings-callback" element={<WithingsCallbackPage />} />
                </Routes>
              </div>
            </Router>
          </AppointmentProvider>
        </NotificationProvider>
      </TechnicianProvider>
    </AuthProvider>
  );
}

export default App;