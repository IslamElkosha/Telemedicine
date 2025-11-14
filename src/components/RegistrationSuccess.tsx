import React from 'react';
import { CheckCircle, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface RegistrationSuccessProps {
  onContinue: () => void;
}

const RegistrationSuccess: React.FC<RegistrationSuccessProps> = ({ onContinue }) => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
        <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Welcome to TeleMedCare!
        </h2>
        
        <p className="text-gray-600 mb-6">
          Your account has been successfully created. You're now ready to access all the features of our telemedicine platform.
        </p>
        
        <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
          <h3 className="font-semibold text-gray-900 mb-2">Account Details</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <p><span className="font-medium">Name:</span> {user?.name}</p>
            <p><span className="font-medium">Email:</span> {user?.email}</p>
            <p><span className="font-medium">Role:</span> {user?.role}</p>
            {user?.specialty && (
              <p><span className="font-medium">Specialty:</span> {user.specialty}</p>
            )}
          </div>
        </div>
        
        {!user?.isVerified && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <Mail className="h-4 w-4 text-yellow-600" />
              <span className="text-yellow-800 font-medium text-sm">Email Verification</span>
            </div>
            <p className="text-yellow-700 text-sm">
              We've sent a verification email to {user?.email}. Please check your inbox and click the verification link to activate all features.
            </p>
          </div>
        )}
        
        <button
          onClick={onContinue}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2"
        >
          <span>Continue to Dashboard</span>
          <ArrowRight className="h-4 w-4" />
        </button>
        
        <p className="text-xs text-gray-500 mt-4">
          You can always update your profile information from your dashboard.
        </p>
      </div>
    </div>
  );
};

export default RegistrationSuccess;