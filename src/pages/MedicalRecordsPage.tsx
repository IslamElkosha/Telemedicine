import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAppointments } from '../contexts/AppointmentContext';
import BackButton from '../components/BackButton';
import { 
  FileText, 
  Calendar, 
  User, 
  Download, 
  Eye, 
  Filter,
  Search,
  Heart,
  Activity,
  Thermometer,
  Droplets,
  Pill,
  TestTube,
  Stethoscope,
  ChevronDown,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface MedicalRecord {
  id: string;
  date: Date;
  type: 'consultation' | 'lab-result' | 'prescription' | 'vital-signs' | 'diagnosis' | 'imaging';
  title: string;
  doctor: string;
  specialty: string;
  summary: string;
  details: any;
  status: 'normal' | 'abnormal' | 'critical' | 'pending';
  attachments?: string[];
}

const MedicalRecordsPage: React.FC = () => {
  const { user } = useAuth();
  const { appointments } = useAppointments();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);

  // Mock medical records data
  const medicalRecords: MedicalRecord[] = [
    {
      id: '1',
      date: new Date(2025, 0, 18),
      type: 'lab-result',
      title: 'Complete Blood Count (CBC)',
      doctor: 'Dr. Sarah Johnson',
      specialty: 'Internal Medicine',
      summary: 'All values within normal limits. Continue current health routine.',
      status: 'normal',
      details: {
        results: [
          { parameter: 'Hemoglobin', value: '14.2', unit: 'g/dL', normalRange: '12.0-15.5', status: 'normal' },
          { parameter: 'White Blood Cells', value: '7.8', unit: 'K/uL', normalRange: '4.5-11.0', status: 'normal' },
          { parameter: 'Platelets', value: '285', unit: 'K/uL', normalRange: '150-450', status: 'normal' },
          { parameter: 'Hematocrit', value: '42.1', unit: '%', normalRange: '36.0-46.0', status: 'normal' }
        ]
      },
      attachments: ['cbc-report-2025-01-18.pdf']
    },
    {
      id: '2',
      date: new Date(2025, 0, 15),
      type: 'consultation',
      title: 'Cardiology Consultation',
      doctor: 'Dr. Sarah Johnson',
      specialty: 'Cardiology',
      summary: 'Regular check-up. Blood pressure slightly elevated, recommend lifestyle changes.',
      status: 'abnormal',
      details: {
        symptoms: 'Occasional chest discomfort, fatigue',
        examination: 'Heart rate regular, blood pressure 140/90',
        recommendations: 'Reduce sodium intake, increase exercise, follow-up in 3 months',
        medications: 'Continue current medications'
      }
    },
    {
      id: '3',
      date: new Date(2025, 0, 14),
      type: 'prescription',
      title: 'Medication Prescription',
      doctor: 'Dr. Sarah Johnson',
      specialty: 'Cardiology',
      summary: 'Prescribed medications for blood pressure management.',
      status: 'normal',
      details: {
        medications: [
          { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', duration: '30 days' },
          { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', duration: '30 days' }
        ],
        instructions: 'Take with food. Monitor blood pressure daily.'
      }
    },
    {
      id: '4',
      date: new Date(2025, 0, 10),
      type: 'vital-signs',
      title: 'Vital Signs Monitoring',
      doctor: 'Dr. Sarah Johnson',
      specialty: 'Cardiology',
      summary: 'Home visit vital signs check. Blood pressure improved.',
      status: 'normal',
      details: {
        vitals: [
          { parameter: 'Blood Pressure', value: '125/82', unit: 'mmHg', status: 'normal' },
          { parameter: 'Heart Rate', value: '72', unit: 'BPM', status: 'normal' },
          { parameter: 'Temperature', value: '98.6', unit: '°F', status: 'normal' },
          { parameter: 'Oxygen Saturation', value: '98', unit: '%', status: 'normal' }
        ]
      }
    },
    {
      id: '5',
      date: new Date(2025, 0, 7),
      type: 'lab-result',
      title: 'Lipid Panel',
      doctor: 'Dr. Sarah Johnson',
      specialty: 'Cardiology',
      summary: 'Cholesterol levels elevated. Dietary changes recommended.',
      status: 'abnormal',
      details: {
        results: [
          { parameter: 'Total Cholesterol', value: '220', unit: 'mg/dL', normalRange: '<200', status: 'high' },
          { parameter: 'HDL Cholesterol', value: '45', unit: 'mg/dL', normalRange: '>40', status: 'normal' },
          { parameter: 'LDL Cholesterol', value: '145', unit: 'mg/dL', normalRange: '<100', status: 'high' },
          { parameter: 'Triglycerides', value: '150', unit: 'mg/dL', normalRange: '<150', status: 'normal' }
        ]
      },
      attachments: ['lipid-panel-2025-01-07.pdf']
    },
    {
      id: '6',
      date: new Date(2024, 11, 28),
      type: 'diagnosis',
      title: 'Hypertension Diagnosis',
      doctor: 'Dr. Sarah Johnson',
      specialty: 'Cardiology',
      summary: 'Diagnosed with Stage 1 Hypertension. Treatment plan initiated.',
      status: 'abnormal',
      details: {
        diagnosis: 'Essential Hypertension (Stage 1)',
        icdCode: 'I10',
        treatmentPlan: 'Lifestyle modifications, medication therapy, regular monitoring',
        followUp: 'Monthly check-ups for 3 months, then quarterly'
      }
    }
  ];

  const getRecordIcon = (type: string) => {
    switch (type) {
      case 'consultation':
        return <Stethoscope className="h-5 w-5 text-blue-600" />;
      case 'lab-result':
        return <TestTube className="h-5 w-5 text-green-600" />;
      case 'prescription':
        return <Pill className="h-5 w-5 text-purple-600" />;
      case 'vital-signs':
        return <Activity className="h-5 w-5 text-red-600" />;
      case 'diagnosis':
        return <FileText className="h-5 w-5 text-orange-600" />;
      case 'imaging':
        return <Eye className="h-5 w-5 text-indigo-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'abnormal':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'abnormal':
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const filteredRecords = medicalRecords.filter(record => {
    const matchesSearch = record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.doctor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.summary.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || record.type === filterType;
    
    const matchesDate = filterDate === 'all' || (() => {
      const recordDate = record.date;
      const now = new Date();
      switch (filterDate) {
        case 'week':
          return (now.getTime() - recordDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
        case 'month':
          return (now.getTime() - recordDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
        case 'year':
          return (now.getTime() - recordDate.getTime()) <= 365 * 24 * 60 * 60 * 1000;
        default:
          return true;
      }
    })();

    return matchesSearch && matchesType && matchesDate;
  });

  const RecordDetailModal = ({ record, onClose }: { record: MedicalRecord; onClose: () => void }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getRecordIcon(record.type)}
              <div>
                <h2 className="text-xl font-bold text-gray-900">{record.title}</h2>
                <p className="text-gray-600">{format(record.date, 'MMMM d, yyyy')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-2"
            >
              ×
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Doctor Information</h3>
              <p className="text-gray-700">{record.doctor}</p>
              <p className="text-gray-600">{record.specialty}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Status</h3>
              <div className="flex items-center space-x-2">
                {getStatusIcon(record.status)}
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(record.status)}`}>
                  {record.status}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Summary</h3>
            <p className="text-gray-700">{record.summary}</p>
          </div>

          {/* Detailed Information */}
          <div className="space-y-6">
            {record.type === 'lab-result' && record.details.results && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Test Results</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-900">Parameter</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-900">Value</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-900">Normal Range</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-900">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {record.details.results.map((result: any, index: number) => (
                        <tr key={index} className="border-t border-gray-200">
                          <td className="px-4 py-2 font-medium text-gray-900">{result.parameter}</td>
                          <td className="px-4 py-2 text-gray-700">{result.value} {result.unit}</td>
                          <td className="px-4 py-2 text-gray-600">{result.normalRange}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              result.status === 'normal' ? 'bg-green-100 text-green-800' :
                              result.status === 'high' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {result.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {record.type === 'consultation' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Symptoms</h4>
                  <p className="text-gray-700">{record.details.symptoms}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Examination</h4>
                  <p className="text-gray-700">{record.details.examination}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                  <p className="text-gray-700">{record.details.recommendations}</p>
                </div>
              </div>
            )}

            {record.type === 'prescription' && record.details.medications && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Medications</h3>
                <div className="space-y-3">
                  {record.details.medications.map((med: any, index: number) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900">{med.name}</h4>
                      <p className="text-gray-600">Dosage: {med.dosage}</p>
                      <p className="text-gray-600">Frequency: {med.frequency}</p>
                      <p className="text-gray-600">Duration: {med.duration}</p>
                    </div>
                  ))}
                </div>
                {record.details.instructions && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Instructions</h4>
                    <p className="text-gray-700">{record.details.instructions}</p>
                  </div>
                )}
              </div>
            )}

            {record.type === 'vital-signs' && record.details.vitals && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Vital Signs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {record.details.vitals.map((vital: any, index: number) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900">{vital.parameter}</h4>
                      <p className="text-2xl font-bold text-gray-900">{vital.value} {vital.unit}</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        vital.status === 'normal' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {vital.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Attachments */}
          {record.attachments && record.attachments.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Attachments</h3>
              <div className="space-y-2">
                {record.attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-gray-600" />
                      <span className="text-gray-900">{attachment}</span>
                    </div>
                    <button className="text-blue-600 hover:text-blue-700 flex items-center space-x-1">
                      <Download className="h-4 w-4" />
                      <span>Download</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-3">
              <BackButton fallbackPath="/patient" showText={false} className="p-2" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Medical Records</h1>
                <p className="text-sm text-gray-600">Complete medical history for {user?.name}</p>
              </div>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Export All</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search records, doctors, or conditions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="consultation">Consultations</option>
                <option value="lab-result">Lab Results</option>
                <option value="prescription">Prescriptions</option>
                <option value="vital-signs">Vital Signs</option>
                <option value="diagnosis">Diagnoses</option>
                <option value="imaging">Imaging</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Date Filter */}
            <div className="relative">
              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Time</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
                <option value="year">Past Year</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Records List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {filteredRecords.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredRecords.map((record) => (
                <div
                  key={record.id}
                  className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedRecord(record)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="bg-gray-100 p-3 rounded-lg">
                        {getRecordIcon(record.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{record.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(record.status)}`}>
                            {record.status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {format(record.date, 'MMM d, yyyy')}
                          </span>
                          <span className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            {record.doctor}
                          </span>
                          <span className="capitalize bg-gray-100 px-2 py-1 rounded-full text-xs">
                            {record.type.replace('-', ' ')}
                          </span>
                        </div>
                        <p className="text-gray-700">{record.summary}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {record.attachments && record.attachments.length > 0 && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {record.attachments.length} file{record.attachments.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      <button className="text-blue-600 hover:text-blue-700 p-2">
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No records found</h3>
              <p className="text-gray-600">
                {searchTerm || filterType !== 'all' || filterDate !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Your medical records will appear here as you have consultations and tests'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <RecordDetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </div>
  );
};

export default MedicalRecordsPage;