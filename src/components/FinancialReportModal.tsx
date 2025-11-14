import React, { useState, useEffect } from 'react';
import { X, Download, Calendar, TrendingUp, Users, Package, DollarSign, Eye } from 'lucide-react';

interface TechnicianRevenue {
  id: string;
  name: string;
  assignedKits: string[];
  consultations: ConsultationRevenue[];
  totalRevenue: number;
  technicianEarnings: number;
  doctorEarnings: number;
  platformRevenue: number;
}

interface ConsultationRevenue {
  id: string;
  date: Date;
  patientName: string;
  doctorName: string;
  kitUsed: string;
  consultationFee: number;
  platformShare: number; // 30%
  doctorShare: number;    // 50%
  technicianShare: number; // 20%
}

interface RevenueData {
  daily: { date: string; revenue: number; consultations: number }[];
  weekly: { week: string; revenue: number; consultations: number }[];
  monthly: { month: string; revenue: number; consultations: number }[];
}

interface FinancialReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FinancialReportModal: React.FC<FinancialReportModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'technicians' | 'revenue'>('overview');
  const [timePeriod, setTimePeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [technicianData, setTechnicianData] = useState<TechnicianRevenue[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData>({
    daily: [],
    weekly: [],
    monthly: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchFinancialData();
    }
  }, [isOpen]);

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data with corrected commission structure
      const mockTechnicians: TechnicianRevenue[] = [
        {
          id: '1',
          name: 'Mike Wilson',
          assignedKits: ['KIT-001', 'KIT-003'],
          consultations: [
            {
              id: '1',
              date: new Date(2025, 0, 20),
              patientName: 'John Smith',
              doctorName: 'Dr. Sarah Johnson',
              kitUsed: 'KIT-001',
              consultationFee: 750,
              platformShare: 225, // 30%
              doctorShare: 375,   // 50%
              technicianShare: 150 // 20%
            },
            {
              id: '2',
              date: new Date(2025, 0, 19),
              patientName: 'Mary Johnson',
              doctorName: 'Dr. Michael Chen',
              kitUsed: 'KIT-003',
              consultationFee: 750,
              platformShare: 225,
              doctorShare: 375,
              technicianShare: 150
            }
          ],
          totalRevenue: 1500,
          technicianEarnings: 300,
          doctorEarnings: 750,
          platformRevenue: 450
        },
        {
          id: '2',
          name: 'Sarah Davis',
          assignedKits: ['KIT-002'],
          consultations: [
            {
              id: '3',
              date: new Date(2025, 0, 18),
              patientName: 'Robert Wilson',
              doctorName: 'Dr. Emily Wilson',
              kitUsed: 'KIT-002',
              consultationFee: 750,
              platformShare: 225,
              doctorShare: 375,
              technicianShare: 150
            }
          ],
          totalRevenue: 750,
          technicianEarnings: 150,
          doctorEarnings: 375,
          platformRevenue: 225
        },
        {
          id: '3',
          name: 'Tom Brown',
          assignedKits: ['KIT-004', 'KIT-005'],
          consultations: [
            {
              id: '4',
              date: new Date(2025, 0, 17),
              patientName: 'Lisa Anderson',
              doctorName: 'Dr. David Thompson',
              kitUsed: 'KIT-004',
              consultationFee: 750,
              platformShare: 225,
              doctorShare: 375,
              technicianShare: 150
            },
            {
              id: '5',
              date: new Date(2025, 0, 16),
              patientName: 'James Miller',
              doctorName: 'Dr. Jennifer Brown',
              kitUsed: 'KIT-005',
              consultationFee: 750,
              platformShare: 225,
              doctorShare: 375,
              technicianShare: 150
            }
          ],
          totalRevenue: 1500,
          technicianEarnings: 300,
          doctorEarnings: 750,
          platformRevenue: 450
        }
      ];

      const mockRevenueData: RevenueData = {
        daily: [
          { date: '2025-01-20', revenue: 750, consultations: 1 },
          { date: '2025-01-19', revenue: 750, consultations: 1 },
          { date: '2025-01-18', revenue: 750, consultations: 1 },
          { date: '2025-01-17', revenue: 750, consultations: 1 },
          { date: '2025-01-16', revenue: 750, consultations: 1 },
          { date: '2025-01-15', revenue: 1500, consultations: 2 },
          { date: '2025-01-14', revenue: 2250, consultations: 3 }
        ],
        weekly: [
          { week: 'Week 3 (Jan 15-21)', revenue: 3750, consultations: 5 },
          { week: 'Week 2 (Jan 8-14)', revenue: 6000, consultations: 8 },
          { week: 'Week 1 (Jan 1-7)', revenue: 4500, consultations: 6 }
        ],
        monthly: [
          { month: 'January 2025', revenue: 14250, consultations: 19 },
          { month: 'December 2024', revenue: 18750, consultations: 25 },
          { month: 'November 2024', revenue: 16500, consultations: 22 }
        ]
      };

      setTechnicianData(mockTechnicians);
      setRevenueData(mockRevenueData);
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const csvContent = generateCSVReport();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateCSVReport = () => {
    let csv = 'TeleMedCare Financial Report\n';
    csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    
    csv += 'REVENUE BREAKDOWN\n';
    csv += 'Technician,Assigned Kits,Total Consultations,Total Revenue,Platform Share (30%),Doctor Share (50%),Technician Share (20%)\n';
    
    technicianData.forEach(tech => {
      csv += `${tech.name},"${tech.assignedKits.join(', ')}",${tech.consultations.length},${tech.totalRevenue},${tech.platformRevenue},${tech.doctorEarnings},${tech.technicianEarnings}\n`;
    });
    
    csv += '\nCONSULTATION DETAILS\n';
    csv += 'Date,Patient,Doctor,Technician,Kit Used,Fee,Platform (30%),Doctor (50%),Technician (20%)\n';
    
    technicianData.forEach(tech => {
      tech.consultations.forEach(consultation => {
        csv += `${consultation.date.toLocaleDateString()},${consultation.patientName},${consultation.doctorName},${tech.name},${consultation.kitUsed},${consultation.consultationFee},${consultation.platformShare},${consultation.doctorShare},${consultation.technicianShare}\n`;
      });
    });
    
    return csv;
  };

  const totalRevenue = technicianData.reduce((sum, tech) => sum + tech.totalRevenue, 0);
  const totalPlatformRevenue = technicianData.reduce((sum, tech) => sum + tech.platformRevenue, 0);
  const totalDoctorEarnings = technicianData.reduce((sum, tech) => sum + tech.doctorEarnings, 0);
  const totalTechnicianEarnings = technicianData.reduce((sum, tech) => sum + tech.technicianEarnings, 0);
  const totalConsultations = technicianData.reduce((sum, tech) => sum + tech.consultations.length, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Financial Dashboard</h2>
            <div className="flex items-center space-x-3">
              <button
                onClick={exportReport}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Export Report</span>
              </button>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            {[
              { key: 'overview', label: 'Overview', icon: TrendingUp },
              { key: 'technicians', label: 'Technicians', icon: Users },
              { key: 'revenue', label: 'Revenue Trends', icon: DollarSign }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading financial data...</span>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-blue-600 text-sm font-medium">Total Revenue</p>
                          <p className="text-2xl font-bold text-blue-900">{totalRevenue.toLocaleString()} LE</p>
                        </div>
                        <DollarSign className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                    
                    <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-600 text-sm font-medium">Platform Revenue (30%)</p>
                          <p className="text-2xl font-bold text-green-900">{totalPlatformRevenue.toLocaleString()} LE</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                    
                    <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-600 text-sm font-medium">Doctor Earnings (50%)</p>
                          <p className="text-2xl font-bold text-purple-900">{totalDoctorEarnings.toLocaleString()} LE</p>
                        </div>
                        <Users className="h-8 w-8 text-purple-600" />
                      </div>
                    </div>
                    
                    <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-orange-600 text-sm font-medium">Technician Earnings (20%)</p>
                          <p className="text-2xl font-bold text-orange-900">{totalTechnicianEarnings.toLocaleString()} LE</p>
                        </div>
                        <Package className="h-8 w-8 text-orange-600" />
                      </div>
                    </div>
                  </div>

                  {/* Commission Structure */}
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Commission Structure</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-blue-600 font-bold text-lg">30%</span>
                        </div>
                        <p className="font-medium text-gray-900">Platform</p>
                        <p className="text-sm text-gray-600">225 LE per consultation</p>
                      </div>
                      <div className="text-center">
                        <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-green-600 font-bold text-lg">50%</span>
                        </div>
                        <p className="font-medium text-gray-900">Doctor</p>
                        <p className="text-sm text-gray-600">375 LE per consultation</p>
                      </div>
                      <div className="text-center">
                        <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-orange-600 font-bold text-lg">20%</span>
                        </div>
                        <p className="font-medium text-gray-900">Technician</p>
                        <p className="text-sm text-gray-600">150 LE per consultation</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Technicians Tab */}
              {activeTab === 'technicians' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Technician Performance</h3>
                  <div className="space-y-4">
                    {technicianData.map(technician => (
                      <div key={technician.id} className="border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">{technician.name}</h4>
                            <p className="text-sm text-gray-600">
                              Assigned Kits: {technician.assignedKits.join(', ')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">{technician.totalRevenue.toLocaleString()} LE</p>
                            <p className="text-sm text-gray-600">{technician.consultations.length} consultations</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="bg-blue-50 p-3 rounded">
                            <p className="text-sm font-medium text-blue-600">Platform Revenue</p>
                            <p className="text-lg font-bold text-blue-900">{technician.platformRevenue.toLocaleString()} LE</p>
                          </div>
                          <div className="bg-green-50 p-3 rounded">
                            <p className="text-sm font-medium text-green-600">Doctor Earnings</p>
                            <p className="text-lg font-bold text-green-900">{technician.doctorEarnings.toLocaleString()} LE</p>
                          </div>
                          <div className="bg-orange-50 p-3 rounded">
                            <p className="text-sm font-medium text-orange-600">Technician Earnings</p>
                            <p className="text-lg font-bold text-orange-900">{technician.technicianEarnings.toLocaleString()} LE</p>
                          </div>
                        </div>

                        {/* Recent Consultations */}
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Recent Consultations</h5>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-3 py-2 text-left font-medium text-gray-900">Date</th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-900">Patient</th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-900">Doctor</th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-900">Kit</th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-900">Revenue</th>
                                </tr>
                              </thead>
                              <tbody>
                                {technician.consultations.map(consultation => (
                                  <tr key={consultation.id} className="border-t border-gray-200">
                                    <td className="px-3 py-2">{consultation.date.toLocaleDateString()}</td>
                                    <td className="px-3 py-2">{consultation.patientName}</td>
                                    <td className="px-3 py-2">{consultation.doctorName}</td>
                                    <td className="px-3 py-2">{consultation.kitUsed}</td>
                                    <td className="px-3 py-2 font-medium">{consultation.consultationFee} LE</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Revenue Trends Tab */}
              {activeTab === 'revenue' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Revenue Trends</h3>
                    <div className="flex space-x-2">
                      {['daily', 'weekly', 'monthly'].map(period => (
                        <button
                          key={period}
                          onClick={() => setTimePeriod(period as any)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium ${
                            timePeriod === period
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {period.charAt(0).toUpperCase() + period.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left font-medium text-gray-900">Period</th>
                          <th className="px-6 py-3 text-left font-medium text-gray-900">Revenue</th>
                          <th className="px-6 py-3 text-left font-medium text-gray-900">Consultations</th>
                          <th className="px-6 py-3 text-left font-medium text-gray-900">Avg per Consultation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revenueData[timePeriod].map((item, index) => (
                          <tr key={index} className="border-t border-gray-200">
                            <td className="px-6 py-4 font-medium text-gray-900">
                              {timePeriod === 'daily' ? item.date : 
                               timePeriod === 'weekly' ? (item as any).week : 
                               (item as any).month}
                            </td>
                            <td className="px-6 py-4 text-gray-900">{item.revenue.toLocaleString()} LE</td>
                            <td className="px-6 py-4 text-gray-900">{item.consultations}</td>
                            <td className="px-6 py-4 text-gray-900">
                              {item.consultations > 0 ? (item.revenue / item.consultations).toFixed(0) : '0'} LE
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialReportModal;