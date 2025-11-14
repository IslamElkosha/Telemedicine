import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, Eye, Calendar, TrendingUp, AlertTriangle } from 'lucide-react';

interface LabResult {
  id: string;
  testName: string;
  date: Date;
  status: 'normal' | 'abnormal' | 'pending';
  results: {
    parameter: string;
    value: string;
    unit: string;
    normalRange: string;
    status: 'normal' | 'high' | 'low';
  }[];
  doctorNotes?: string;
  downloadUrl?: string;
}

const RecentLabResults: React.FC = () => {
  const navigate = useNavigate();

  const labResults: LabResult[] = [
    {
      id: '1',
      testName: 'Complete Blood Count (CBC)',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      status: 'normal',
      results: [
        { parameter: 'Hemoglobin', value: '14.2', unit: 'g/dL', normalRange: '12.0-15.5', status: 'normal' },
        { parameter: 'White Blood Cells', value: '7.8', unit: 'K/uL', normalRange: '4.5-11.0', status: 'normal' },
        { parameter: 'Platelets', value: '285', unit: 'K/uL', normalRange: '150-450', status: 'normal' }
      ],
      doctorNotes: 'All values within normal limits. Continue current health routine.',
      downloadUrl: '/reports/cbc-2025-01-18.pdf'
    },
    {
      id: '2',
      testName: 'Lipid Panel',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      status: 'abnormal',
      results: [
        { parameter: 'Total Cholesterol', value: '220', unit: 'mg/dL', normalRange: '<200', status: 'high' },
        { parameter: 'HDL Cholesterol', value: '45', unit: 'mg/dL', normalRange: '>40', status: 'normal' },
        { parameter: 'LDL Cholesterol', value: '145', unit: 'mg/dL', normalRange: '<100', status: 'high' },
        { parameter: 'Triglycerides', value: '150', unit: 'mg/dL', normalRange: '<150', status: 'normal' }
      ],
      doctorNotes: 'Cholesterol levels are elevated. Recommend dietary changes and follow-up in 3 months.',
      downloadUrl: '/reports/lipid-2025-01-14.pdf'
    },
    {
      id: '3',
      testName: 'Thyroid Function Test',
      date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
      status: 'normal',
      results: [
        { parameter: 'TSH', value: '2.1', unit: 'mIU/L', normalRange: '0.4-4.0', status: 'normal' },
        { parameter: 'Free T4', value: '1.3', unit: 'ng/dL', normalRange: '0.8-1.8', status: 'normal' }
      ],
      doctorNotes: 'Thyroid function is normal.',
      downloadUrl: '/reports/thyroid-2025-01-07.pdf'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'abnormal':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getParameterStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'text-green-600';
      case 'high':
        return 'text-red-600';
      case 'low':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Recent Lab Results</h3>
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            View All Results
          </button>
        </div>
      </div>
      
      <div className="p-6">
        <div className="space-y-6">
          {labResults.map((result) => (
            <div key={result.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{result.testName}</h4>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span>{result.date.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(result.status)}`}>
                    {result.status}
                  </span>
                  {result.status === 'abnormal' && (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {result.results.map((param, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{param.parameter}</span>
                      <span className={`text-sm font-medium ${getParameterStatusColor(param.status)}`}>
                        {param.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-gray-900">
                        {param.value} {param.unit}
                      </span>
                      <span className="text-gray-500">
                        Normal: {param.normalRange}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              {result.doctorNotes && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <h5 className="font-medium text-blue-900 mb-1">Doctor's Notes</h5>
                  <p className="text-sm text-blue-800">{result.doctorNotes}</p>
                </div>
              )}
              
              <div className="flex items-center space-x-3">
                <button className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                  <Eye className="h-4 w-4" />
                  <span>View Details</span>
                </button>
                {result.downloadUrl && (
                  <button className="flex items-center space-x-2 bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm">
                    <Download className="h-4 w-4" />
                    <span>Download PDF</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 text-center">
          <button 
            onClick={() => navigate('/patient/medical-records')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            View Complete Medical History
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecentLabResults;