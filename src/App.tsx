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
import ProtectedRoute from './components/ProtectedRoute';

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

                  {/* Protected Dashboard Routes */}
                  <Route
                    path="/patient/*"
                    element={
                      <ProtectedRoute allowedRoles={['patient']}>
                        <PatientDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/doctor/*"
                    element={
                      <ProtectedRoute allowedRoles={['doctor']}>
                        <DoctorDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/technician/*"
                    element={
                      <ProtectedRoute allowedRoles={['technician']}>
                        <TechnicianPortal />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/*"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/hospital/*"
                    element={
                      <ProtectedRoute allowedRoles={['hospital']}>
                        <PrivateHospitalDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/freelance-tech/*"
                    element={
                      <ProtectedRoute allowedRoles={['freelance-tech']}>
                        <FreelanceTechnicianDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Shared Protected Routes */}
                  <Route
                    path="/video-call/:appointmentId"
                    element={
                      <ProtectedRoute>
                        <VideoCall />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/book-appointment"
                    element={
                      <ProtectedRoute>
                        <BookAppointment />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/payment"
                    element={
                      <ProtectedRoute>
                        <PaymentPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/diagnostics"
                    element={
                      <ProtectedRoute>
                        <DiagnosticsPage />
                      </ProtectedRoute>
                    }
                  />
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