import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppointments } from '../contexts/AppointmentContext';
import BackButton from '../components/BackButton';
import { 
  CreditCard, 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Loader,
  Calendar,
  MapPin,
  User,
  DollarSign,
  Lock
} from 'lucide-react';

interface PaymentMethod {
  id: string;
  name: string;
  type: 'card' | 'wallet' | 'bank';
  icon: string;
  fees: number;
}

const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { appointments, updateAppointment } = useAppointments();
  
  const appointmentId = searchParams.get('appointmentId');
  const appointment = appointments.find(apt => apt.id === appointmentId);
  
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [cardData, setCardData] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'visa',
      name: 'Credit/Debit Card',
      type: 'card',
      icon: '💳',
      fees: 0
    },
    {
      id: 'fawry',
      name: 'Fawry',
      type: 'wallet',
      icon: '📱',
      fees: 5
    },
    {
      id: 'vodafone-cash',
      name: 'Vodafone Cash',
      type: 'wallet',
      icon: '📲',
      fees: 10
    },
    {
      id: 'bank-transfer',
      name: 'Bank Transfer',
      type: 'bank',
      icon: '🏦',
      fees: 0
    }
  ];

  const baseAmount = 750; // Fixed fee for home visits
  const selectedMethodData = paymentMethods.find(m => m.id === selectedMethod);
  const totalAmount = baseAmount + (selectedMethodData?.fees || 0);

  useEffect(() => {
    if (!appointment || appointment.type !== 'home-visit') {
      navigate('/patient');
    }
  }, [appointment, navigate]);

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const handleCardInputChange = (field: string, value: string) => {
    let formattedValue = value;
    
    if (field === 'number') {
      formattedValue = formatCardNumber(value);
    } else if (field === 'expiry') {
      formattedValue = formatExpiry(value);
    } else if (field === 'cvv') {
      formattedValue = value.replace(/[^0-9]/g, '').substring(0, 3);
    }
    
    setCardData(prev => ({ ...prev, [field]: formattedValue }));
  };

  const validateCardData = () => {
    if (!cardData.number || cardData.number.replace(/\s/g, '').length < 16) {
      return 'Please enter a valid card number';
    }
    if (!cardData.expiry || cardData.expiry.length < 5) {
      return 'Please enter a valid expiry date';
    }
    if (!cardData.cvv || cardData.cvv.length < 3) {
      return 'Please enter a valid CVV';
    }
    if (!cardData.name.trim()) {
      return 'Please enter the cardholder name';
    }
    return null;
  };

  const processPayment = async () => {
    setProcessing(true);
    setPaymentError(null);

    try {
      // Validate payment method
      if (!selectedMethod) {
        throw new Error('Please select a payment method');
      }

      // Demo mode: Skip validation for card payments
      // In production, you would validate card data here

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Demo mode: Payment always succeeds
      // Update appointment with payment status
      if (appointment) {
        await updateAppointment(appointment.id, {
          paymentStatus: 'paid'
        });
      }

      setPaymentSuccess(true);

      // Redirect to patient dashboard after 2 seconds
      setTimeout(() => {
        navigate('/patient?payment=success');
      }, 2000);
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  if (!appointment) {
    return null;
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Payment Successful!
          </h2>

          <p className="text-gray-600 mb-6">
            Your payment has been processed successfully.
            Your home visit appointment is now confirmed.
          </p>

          <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-2">Appointment Details</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Doctor:</span> {appointment.doctorName}</p>
              <p><span className="font-medium">Date:</span> {appointment.date.toLocaleDateString()} at {appointment.time}</p>
              <p><span className="font-medium">Type:</span> Home Visit</p>
              <p><span className="font-medium">Status:</span> <span className="text-green-600">Confirmed</span></p>
            </div>
          </div>

          <p className="text-sm text-gray-500">
            Redirecting to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <BackButton fallbackPath="/patient" />
          <h1 className="text-xl font-bold text-gray-900">Payment</h1>
          <div className="w-20"></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Demo Mode Notice */}
            <div className="bg-green-50 border border-green-300 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900">Demo Mode Active</span>
              </div>
              <p className="text-green-800 text-sm mt-1">
                This is a demonstration. Simply select any payment method and click Pay to continue. No real payment will be processed.
              </p>
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">Secure Payment</span>
              </div>
              <p className="text-blue-800 text-sm mt-1">
                Your payment information is encrypted and secure. We never store your card details.
              </p>
            </div>

            {/* Error Message */}
            {paymentError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-900">Payment Error</span>
                </div>
                <p className="text-red-800 text-sm mt-1">{paymentError}</p>
              </div>
            )}

            {/* Payment Methods */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Payment Method</h3>
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      selectedMethod === method.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{method.icon}</span>
                        <div>
                          <h4 className="font-medium text-gray-900">{method.name}</h4>
                          <p className="text-sm text-gray-600">
                            {method.fees > 0 ? `+${method.fees} LE processing fee` : 'No additional fees'}
                          </p>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        selectedMethod === method.id
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedMethod === method.id && (
                          <div className="w-full h-full rounded-full bg-white scale-50"></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card Details Form */}
            {selectedMethod === 'visa' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Card Details</h3>
                <p className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded-lg">
                  Demo Mode: Card details are optional. You can leave these fields empty and proceed to payment.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Card Number <span className="text-gray-400">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={cardData.number}
                      onChange={(e) => handleCardInputChange('number', e.target.value)}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expiry Date <span className="text-gray-400">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={cardData.expiry}
                        onChange={(e) => handleCardInputChange('expiry', e.target.value)}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CVV <span className="text-gray-400">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={cardData.cvv}
                        onChange={(e) => handleCardInputChange('cvv', e.target.value)}
                        placeholder="123"
                        maxLength={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cardholder Name <span className="text-gray-400">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={cardData.name}
                      onChange={(e) => handleCardInputChange('name', e.target.value)}
                      placeholder="John Smith"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Other Payment Method Instructions */}
            {selectedMethod && selectedMethod !== 'visa' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Instructions</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {selectedMethod === 'fawry' && (
                    <p className="text-gray-700">
                      You will be redirected to Fawry to complete your payment securely. 
                      You can pay using your Fawry account or at any Fawry location.
                    </p>
                  )}
                  {selectedMethod === 'vodafone-cash' && (
                    <p className="text-gray-700">
                      You will receive an SMS with payment instructions. 
                      Follow the prompts to complete payment using your Vodafone Cash wallet.
                    </p>
                  )}
                  {selectedMethod === 'bank-transfer' && (
                    <p className="text-gray-700">
                      Bank transfer details will be provided after confirmation. 
                      Payment must be completed within 24 hours to secure your appointment.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
              
              {/* Appointment Details */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span>{appointment.doctorName}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>{appointment.date.toLocaleDateString()} at {appointment.time}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>Home Visit</span>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Home Visit Fee</span>
                  <span className="font-medium">{baseAmount} LE</span>
                </div>
                {selectedMethodData && selectedMethodData.fees > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Processing Fee</span>
                    <span className="font-medium">{selectedMethodData.fees} LE</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between text-lg font-semibold mb-6">
                <span>Total</span>
                <span className="text-blue-600">{totalAmount} LE</span>
              </div>

              {/* Pay Button */}
              <button
                onClick={processPayment}
                disabled={!selectedMethod || processing}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {processing ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>Pay {totalAmount} LE</span>
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center mt-3">
                By proceeding, you agree to our terms and conditions
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;