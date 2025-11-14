import React, { useState } from 'react';
import { useTechnician, TechnicianRegistrationData } from '../contexts/TechnicianContext';
import AddressSelector from './AddressSelector';
import { 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle, 
  Loader, 
  Wrench,
  Shield,
  UserPlus,
  LogIn
} from 'lucide-react';

const TechnicianAuth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<TechnicianRegistrationData>({
    name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    phone: '',
    nationalId: '',
    licenseNumber: '',
    employmentType: 'employed',
    serviceArea: {
      governorate: '',
      cities: [],
      radius: 10
    },
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    }
  });

  const { login, register, loading } = useTechnician();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    
    if (isLogin) {
      const result = await login(formData.username || formData.email, formData.password);
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || 'Login failed');
      }
    } else {
      // Validation for registration
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters long');
        return;
      }
      
      if (!formData.serviceArea.governorate || formData.serviceArea.cities.length === 0) {
        setError('Please select your service area');
        return;
      }
      
      const result = await register(formData);
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || 'Registration failed');
      }
    }
  };

  const fillDemoCredentials = () => {
    setFormData(prev => ({
      ...prev,
      username: 'mike_wilson',
      email: 'mike.wilson@telemedcare.com',
      password: 'tech123',
      confirmPassword: 'tech123'
    }));
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleServiceAreaChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      serviceArea: { ...prev.serviceArea, [field]: value }
    }));
  };

  const handleEmergencyContactChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      emergencyContact: { ...prev.emergencyContact, [field]: value }
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wrench className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Technician Portal
          </h1>
          <p className="text-gray-600">
            {isLogin ? 'Sign in to access your dashboard' : 'Join our team of medical technicians'}
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-800 font-medium">
                {isLogin ? 'Login successful!' : 'Registration successful!'}
              </span>
            </div>
            <p className="text-green-700 text-sm mt-1">
              {isLogin ? 'Redirecting to your dashboard...' : 'Your account is being verified. You will receive an email confirmation.'}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-800 font-medium">Error</span>
            </div>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Login Form */}
          {isLogin ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username or Email *
                </label>
                <input
                  type="text"
                  required
                  value={formData.username || formData.email}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.includes('@')) {
                      handleInputChange('email', value);
                      handleInputChange('username', '');
                    } else {
                      handleInputChange('username', value);
                      handleInputChange('email', '');
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter username or email"
                  disabled={loading}
                />
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
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter your password"
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
              </div>
            </>
          ) : (
            /* Registration Form */
            <>
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter your full name"
                      disabled={loading}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter your email"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Choose a unique username"
                      disabled={loading}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="+20 1XX XXX XXXX"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      National ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nationalId}
                      onChange={(e) => handleInputChange('nationalId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="14-digit National ID"
                      maxLength={14}
                      disabled={loading}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      License Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.licenseNumber}
                      onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Medical technician license"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employment Type *
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      onClick={() => handleInputChange('employmentType', 'employed')}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        formData.employmentType === 'employed'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <h4 className="font-medium text-gray-900">Employed</h4>
                      <p className="text-sm text-gray-600">Full-time employee with fixed salary</p>
                    </div>
                    <div
                      onClick={() => handleInputChange('employmentType', 'freelance')}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        formData.employmentType === 'freelance'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <h4 className="font-medium text-gray-900">Freelance</h4>
                      <p className="text-sm text-gray-600">Independent contractor with commission-based pay</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Area */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Service Area Assignment</h3>
                
                <AddressSelector
                  selectedGovernorate={formData.serviceArea.governorate}
                  selectedCity=""
                  onGovernorateChange={(governorateId) => handleServiceAreaChange('governorate', governorateId)}
                  onCityChange={(cityId) => {
                    const currentCities = formData.serviceArea.cities;
                    if (cityId && !currentCities.includes(cityId)) {
                      handleServiceAreaChange('cities', [...currentCities, cityId]);
                    }
                  }}
                  disabled={loading}
                />

                {/* Selected Cities */}
                {formData.serviceArea.cities.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selected Service Cities
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {formData.serviceArea.cities.map(cityId => (
                        <span
                          key={cityId}
                          className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm flex items-center space-x-2"
                        >
                          <span>{cityId}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const newCities = formData.serviceArea.cities.filter(c => c !== cityId);
                              handleServiceAreaChange('cities', newCities);
                            }}
                            className="text-purple-600 hover:text-purple-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Radius (km) *
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    required
                    value={formData.serviceArea.radius}
                    onChange={(e) => handleServiceAreaChange('radius', parseInt(e.target.value) || 10)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum distance you're willing to travel for appointments
                  </p>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Emergency Contact</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.emergencyContact.name}
                      onChange={(e) => handleEmergencyContactChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Emergency contact name"
                      disabled={loading}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.emergencyContact.phone}
                      onChange={(e) => handleEmergencyContactChange('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="+20 1XX XXX XXXX"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship *
                  </label>
                  <select
                    required
                    value={formData.emergencyContact.relationship}
                    onChange={(e) => handleEmergencyContactChange('relationship', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={loading}
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

              {/* Password Fields */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Security</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Create a strong password"
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                </div>
              </div>
            </>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success}
            className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading && <Loader className="h-4 w-4 animate-spin" />}
            {!loading && (isLogin ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />)}
            <span>
              {loading 
                ? (isLogin ? 'Signing In...' : 'Creating Account...') 
                : (isLogin ? 'Sign In' : 'Create Account')
              }
            </span>
          </button>
        </form>

        {/* Demo Credentials */}
        {isLogin && !loading && !success && (
          <div className="mt-4 text-center">
            <button
              onClick={fillDemoCredentials}
              className="text-sm text-purple-600 hover:text-purple-700 underline"
            >
              Use Demo Credentials
            </button>
          </div>
        )}

        {/* Toggle Auth Mode */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setSuccess(false);
              setFormData({
                name: '',
                email: '',
                username: '',
                password: '',
                confirmPassword: '',
                phone: '',
                nationalId: '',
                licenseNumber: '',
                employmentType: 'employed',
                serviceArea: {
                  governorate: '',
                  cities: [],
                  radius: 10
                },
                emergencyContact: {
                  name: '',
                  phone: '',
                  relationship: ''
                }
              });
            }}
            disabled={loading}
            className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            {isLogin ? "Don't have an account? Register here" : 'Already have an account? Sign in'}
          </button>
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="h-4 w-4 text-gray-600" />
            <span className="text-gray-800 font-medium text-sm">Security & Privacy</span>
          </div>
          <p className="text-gray-700 text-sm">
            Your personal information is encrypted and secure. All medical data is handled in compliance with healthcare privacy regulations.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TechnicianAuth;