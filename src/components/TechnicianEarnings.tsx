import React, { useState, useEffect } from 'react';
import { useTechnician } from '../contexts/TechnicianContext';
import BackButton from './BackButton';
import { 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Download, 
  Eye,
  Filter,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const TechnicianEarnings: React.FC = () => {
  const { profile, earnings, fetchEarnings, loading } = useTechnician();
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [showTransactions, setShowTransactions] = useState(false);

  useEffect(() => {
    fetchEarnings(selectedPeriod);
  }, [selectedPeriod, fetchEarnings]);

  const generateChartData = () => {
    if (!earnings) return [];
    
    // Generate mock chart data based on period
    const data = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      let label = '';
      let earnings = Math.floor(Math.random() * 1000) + 500;
      
      switch (selectedPeriod) {
        case 'daily':
          date.setDate(date.getDate() - i);
          label = date.toLocaleDateString('en-US', { weekday: 'short' });
          break;
        case 'weekly':
          date.setDate(date.getDate() - (i * 7));
          label = `Week ${date.getWeek()}`;
          break;
        case 'monthly':
          date.setMonth(date.getMonth() - i);
          label = date.toLocaleDateString('en-US', { month: 'short' });
          break;
        case 'yearly':
          date.setFullYear(date.getFullYear() - i);
          label = date.getFullYear().toString();
          earnings = Math.floor(Math.random() * 10000) + 5000;
          break;
      }
      
      data.push({
        period: label,
        earnings,
        visits: Math.floor(earnings / 225) // 225 LE per visit
      });
    }
    
    return data;
  };

  const chartData = generateChartData();

  const exportEarningsReport = () => {
    if (!earnings) return;
    
    let csvContent = `TeleMedCare Technician Earnings Report\n`;
    csvContent += `Technician: ${profile?.name}\n`;
    csvContent += `Period: ${selectedPeriod}\n`;
    csvContent += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    
    csvContent += `SUMMARY\n`;
    csvContent += `Total Visits,${earnings.totalVisits}\n`;
    csvContent += `Completed Visits,${earnings.completedVisits}\n`;
    csvContent += `Total Patient Payments,${earnings.totalRevenue} LE\n`;
    csvContent += `Your Earnings (30%),${earnings.technicianEarnings} LE\n`;
    csvContent += `Average per Visit,${earnings.averagePerVisit} LE\n\n`;
    
    csvContent += `TRANSACTION DETAILS\n`;
    csvContent += `Date,Patient,Doctor,Patient Payment,Your Commission,Status\n`;
    
    earnings.transactions.forEach(transaction => {
      csvContent += `${transaction.date.toLocaleDateString()},${transaction.patientName},${transaction.doctorName},${transaction.patientPayment} LE,${transaction.technicianCommission} LE,${transaction.status}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `technician-earnings-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Earnings Dashboard</h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportEarningsReport}
            disabled={!earnings}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </button>
          <BackButton fallbackPath="/technician" />
        </div>
      </div>

      {/* Period Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <Filter className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">View by:</span>
          <div className="flex space-x-2">
            {['daily', 'weekly', 'monthly', 'yearly'].map(period => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period as any)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === period
                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Earnings Overview */}
      {earnings && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">{earnings.technicianEarnings.toLocaleString()} LE</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed Visits</p>
                <p className="text-2xl font-bold text-gray-900">{earnings.completedVisits}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average per Visit</p>
                <p className="text-2xl font-bold text-gray-900">{earnings.averagePerVisit} LE</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <CreditCard className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{earnings.totalRevenue.toLocaleString()} LE</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Commission Structure */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Commission Structure</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-purple-600 font-bold text-lg">30%</span>
            </div>
            <h4 className="font-medium text-gray-900">Your Commission</h4>
            <p className="text-sm text-gray-600">225 LE per home visit</p>
          </div>
          <div className="text-center">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-blue-600 font-bold text-lg">50%</span>
            </div>
            <h4 className="font-medium text-gray-900">Doctor Commission</h4>
            <p className="text-sm text-gray-600">375 LE per consultation</p>
          </div>
          <div className="text-center">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-gray-600 font-bold text-lg">20%</span>
            </div>
            <h4 className="font-medium text-gray-900">Platform Fee</h4>
            <p className="text-sm text-gray-600">150 LE per consultation</p>
          </div>
        </div>
      </div>

      {/* Earnings Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Earnings Trend</h3>
          <button
            onClick={() => setShowTransactions(!showTransactions)}
            className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center space-x-1"
          >
            <Eye className="h-4 w-4" />
            <span>{showTransactions ? 'Hide' : 'Show'} Transactions</span>
          </button>
        </div>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip 
                formatter={(value: any, name: string) => [
                  `${value} ${name === 'earnings' ? 'LE' : 'visits'}`,
                  name === 'earnings' ? 'Earnings' : 'Visits'
                ]}
              />
              <Bar dataKey="earnings" fill="#9333ea" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transaction Details */}
      {showTransactions && earnings && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Patient</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Doctor</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Patient Payment</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Your Commission</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.transactions.map(transaction => (
                    <tr key={transaction.id} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-gray-700">
                        {transaction.date.toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-gray-700">{transaction.patientName}</td>
                      <td className="py-3 px-4 text-gray-700">{transaction.doctorName}</td>
                      <td className="py-3 px-4 text-gray-700 font-medium">
                        {transaction.patientPayment} LE
                      </td>
                      <td className="py-3 px-4 text-green-600 font-medium">
                        {transaction.technicianCommission} LE
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.status === 'paid' ? 'bg-green-100 text-green-800' :
                          transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {transaction.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Payment Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Bank Details</h4>
            {profile?.bankDetails ? (
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Bank:</span>
                  <span className="font-medium">{profile.bankDetails.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Account:</span>
                  <span className="font-medium">****{profile.bankDetails.accountNumber.slice(-4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Holder:</span>
                  <span className="font-medium">{profile.bankDetails.accountHolderName}</span>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-yellow-800 font-medium">Bank details required</span>
                </div>
                <p className="text-yellow-700 text-sm mt-1">
                  Please add your bank details in settings to receive payments.
                </p>
              </div>
            )}
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Payment Schedule</h4>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-blue-900 font-medium">Weekly Payments</span>
              </div>
              <p className="text-blue-800 text-sm">
                Earnings are processed every Friday and transferred to your bank account within 2-3 business days.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function for week calculation
declare global {
  interface Date {
    getWeek(): number;
  }
}

Date.prototype.getWeek = function() {
  const date = new Date(this.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

export default TechnicianEarnings;