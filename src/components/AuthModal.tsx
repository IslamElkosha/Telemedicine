import React, { useState } from 'react';
import { X, Eye, EyeOff, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useAuth, RegistrationData, AuthError } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRole: string;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, selectedRole }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    specialty: '',
    license: ''
  });
  const { login, register, loading } = useAuth();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    
    if (isLogin) {
      const result = await login(formData.email, formData.password, selectedRole as any);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          navigate(`/${selectedRole}`);
        }, 1000);
      } else {
        setError(result.error || { message: 'Login failed' });
      }
    } else {
      const registrationData: RegistrationData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        role: selectedRole as any,
        specialty: formData.specialty,
        license: formData.license,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        address: formData.address
      };
      
      const result = await register(registrationData);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          navigate(`/${selectedRole}`);
        }, 1500);
      } else {
        setError(result.error || { message: 'Registration failed' });
      }
    }
  };

  const getRoleDisplayName = (role: string) => {
    const roleMap: { [key: string]: string } = {
      'patient': 'Patient',
      'doctor': 'Doctor',
      'technician': 'Technician',
      'admin': 'Administrator',
      'hospital': 'Private Hospital',
      'freelance-tech': 'Freelance Technician'
    };
    return roleMap[role] || role;
  };


  const getFieldError = (field: string) => {
    return error?.field === field ? error.message : null;
  };

  const hasFieldError = (field: string) => {
    return error?.field === field;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-800 font-medium">
                {isLogin ? 'Login successful!' : 'Registration successful!'}
              </span>
            </div>
            <p className="text-green-700 text-sm mt-1">Redirecting to your dashboard...</p>
          </div>
        )}

        {/* General Error Message */}
        {error && !error.field && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-800 font-medium">Error</span>
            </div>
            <p className="text-red-700 text-sm mt-1">{error.message}</p>
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isLogin ? 'Sign In' : 'Sign Up'} as {getRoleDisplayName(selectedRole)}
          </h2>
          <p className="text-gray-600">
            {isLogin ? 'Access your dashboard' : 'Create your account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  hasFieldError('name') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter your full name"
                disabled={loading}
              />
              {getFieldError('name') && (
                <p className="text-red-600 text-sm mt-1">{getFieldError('name')}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                hasFieldError('email') ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Enter your email"
              disabled={loading}
            />
            {getFieldError('email') && (
              <p className="text-red-600 text-sm mt-1">{getFieldError('email')}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  hasFieldError('password') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder={isLogin ? "Enter your password" : "Create a strong password"}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {getFieldError('password') && (
              <p className="text-red-600 text-sm mt-1">{getFieldError('password')}</p>
            )}
            {!isLogin && (
              <p className="text-gray-600 text-xs mt-1">
                Password must be at least 8 characters with uppercase, lowercase, and number
              </p>
            )}
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    hasFieldError('confirmPassword') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Confirm your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {getFieldError('confirmPassword') && (
                <p className="text-red-600 text-sm mt-1">{getFieldError('confirmPassword')}</p>
              )}
              {!isLogin && selectedRole === 'admin' && (
                <p className="text-blue-600 text-xs mt-1">
                  Administrator password must be at least 12 characters with special characters
                </p>
              )}
            </div>
          )}

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+1 (555) 123-4567"
                disabled={loading}
              />
            </div>
          )}

          {!isLogin && selectedRole === 'doctor' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specialty *
                </label>
                <select
                  value={formData.specialty}
                  onChange={(e) => setFormData(prev => ({ ...prev, specialty: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    hasFieldError('specialty') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  disabled={loading}
                  required
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
                {getFieldError('specialty') && (
                  <p className="text-red-600 text-sm mt-1">{getFieldError('specialty')}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Number *
                </label>
                <input
                  type="text"
                  required
                  value={formData.license}
                  onChange={(e) => setFormData(prev => ({ ...prev, license: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    hasFieldError('license') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="e.g., MD12345"
                  disabled={loading}
                  maxLength={20}
                />
                {getFieldError('license') && (
                  <p className="text-red-600 text-sm mt-1">{getFieldError('license')}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Enter your medical license number (uppercase letters and numbers only)
                </p>
              </div>
            </>
          )}

          {!isLogin && selectedRole === 'admin' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-yellow-800 font-medium text-sm">Administrator Registration</span>
              </div>
              <p className="text-yellow-700 text-sm">
                Only pre-authorized email addresses can create administrator accounts. 
                Contact system administrators if you need access.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || success}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading && <Loader className="h-4 w-4 animate-spin" />}
            <span>
              {loading 
                ? (isLogin ? 'Signing In...' : 'Creating Account...') 
                : (isLogin ? 'Sign In' : 'Create Account')
              }
            </span>
          </button>
        </form>


        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setSuccess(false);
              setFormData({
                email: '',
                password: '',
                confirmPassword: '',
                name: '',
                phone: '',
                dateOfBirth: '',
                address: '',
                specialty: '',
                license: ''
              });
            }}
            disabled={loading}
            className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;