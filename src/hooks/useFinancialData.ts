import { useState, useEffect } from 'react';
import { 
  PlatformRevenue, 
  HomeVisitTransaction, 
  HospitalSubscription, 
  FreelanceTechnician,
  DoctorPayout,
  TechnicianPayout,
  TimeFilter,
  RevenueChartData,
  PieChartData
} from '../types/financial';

const API_BASE_URL = 'http://localhost:3001/api/admin';

export const useFinancialData = () => {
  const [platformRevenue, setPlatformRevenue] = useState<PlatformRevenue | null>(null);
  const [homeVisits, setHomeVisits] = useState<HomeVisitTransaction[]>([]);
  const [hospitalSubscriptions, setHospitalSubscriptions] = useState<HospitalSubscription[]>([]);
  const [freelanceTechnicians, setFreelanceTechnicians] = useState<FreelanceTechnician[]>([]);
  const [doctorPayouts, setDoctorPayouts] = useState<DoctorPayout[]>([]);
  const [technicianPayouts, setTechnicianPayouts] = useState<TechnicianPayout[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>({ period: 'monthly' });

  // API call helper with admin authentication
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin-token', // In real app, get from auth context
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }
    
    return response.json();
  };

  const fetchFinancialOverview = async (filters?: TimeFilter) => {
    setLoading(true);
    setError(null);
    
    try {
      const overview = await apiCall('/financials/overview');
      setPlatformRevenue(overview);
      
      if (filters) {
        setTimeFilter(filters);
      }
    } catch (err) {
      setError('Failed to fetch financial overview');
      console.error('Financial overview error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (source?: string, filters?: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (source) params.append('source', source);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.status) params.append('status', filters.status);
      
      const response = await apiCall(`/financials/transactions?${params.toString()}`);
      
      // Separate transactions by type
      const homeVisitTransactions = response.transactions.filter((t: any) => t.patientName);
      const hospitalTransactions = response.transactions.filter((t: any) => t.hospitalName && !t.patientName);
      const freelanceTransactions = response.transactions.filter((t: any) => t.name && !t.hospitalName);
      
      setHomeVisits(homeVisitTransactions);
      setHospitalSubscriptions(hospitalTransactions);
      setFreelanceTechnicians(freelanceTransactions);
    } catch (err) {
      setError('Failed to fetch transactions');
      console.error('Transactions error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctorPayouts = async (filters?: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (filters?.doctorId) params.append('doctorId', filters.doctorId);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
      
      const response = await apiCall(`/financials/payouts/doctors?${params.toString()}`);
      setDoctorPayouts(response.doctors);
    } catch (err) {
      setError('Failed to fetch doctor payouts');
      console.error('Doctor payouts error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicianPayouts = async (filters?: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (filters?.technicianId) params.append('technicianId', filters.technicianId);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
      if (filters?.type) params.append('type', filters.type);
      
      const response = await apiCall(`/financials/payouts/technicians?${params.toString()}`);
      setTechnicianPayouts(response.technicians);
    } catch (err) {
      setError('Failed to fetch technician payouts');
      console.error('Technician payouts error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHospitalPayouts = async (filters?: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (filters?.hospitalId) params.append('hospitalId', filters.hospitalId);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
      
      const response = await apiCall(`/financials/payouts/hospitals?${params.toString()}`);
      setHospitalSubscriptions(response.hospitals);
    } catch (err) {
      setError('Failed to fetch hospital payouts');
      console.error('Hospital payouts error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFreelancePayouts = async (filters?: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (filters?.technicianId) params.append('technicianId', filters.technicianId);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
      
      const response = await apiCall(`/financials/payouts/freelance?${params.toString()}`);
      setFreelanceTechnicians(response.freelanceTechnicians);
    } catch (err) {
      setError('Failed to fetch freelance payouts');
      console.error('Freelance payouts error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRevenueChartData = (): RevenueChartData[] => {
    if (!platformRevenue) return [];
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => ({
      name: month,
      homeVisits: Math.floor(platformRevenue.revenueStreams.homeVisits / 6),
      hospitalSubscriptions: Math.floor(platformRevenue.revenueStreams.hospitalSubscriptions / 6),
      freelanceSubscriptions: Math.floor(platformRevenue.revenueStreams.freelanceSubscriptions / 6),
      total: Math.floor(platformRevenue.totalRevenue / 6)
    }));
  };

  const getPieChartData = (): PieChartData[] => {
    if (!platformRevenue) return [];
    
    const total = platformRevenue.totalRevenue;
    return [
      {
        name: 'Home Visits (30%)',
        value: platformRevenue.revenueStreams.homeVisits,
        percentage: Math.round((platformRevenue.revenueStreams.homeVisits / total) * 100),
        color: '#3B82F6'
      },
      {
        name: 'Hospital Subscriptions',
        value: platformRevenue.revenueStreams.hospitalSubscriptions,
        percentage: Math.round((platformRevenue.revenueStreams.hospitalSubscriptions / total) * 100),
        color: '#10B981'
      },
      {
        name: 'Freelance Subscriptions',
        value: platformRevenue.revenueStreams.freelanceSubscriptions,
        percentage: Math.round((platformRevenue.revenueStreams.freelanceSubscriptions / total) * 100),
        color: '#8B5CF6'
      }
    ];
  };

  const exportFinancialReport = async (reportType: string, format: 'csv' | 'pdf' = 'csv', filters?: any) => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/financials/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify({
          reportType,
          format,
          filters
        })
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `telemedcare-${reportType}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (err) {
      setError('Failed to export report');
      return { success: false, error: 'Failed to export report' };
    } finally {
      setLoading(false);
    }
  };

  const filterDataByTimeRange = (startDate: Date, endDate: Date) => {
    const filters = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
    
    // Fetch filtered data from API
    fetchTransactions(undefined, filters);
    fetchDoctorPayouts(filters);
    fetchTechnicianPayouts(filters);
    fetchHospitalPayouts(filters);
    fetchFreelancePayouts(filters);
  };

  // Initialize data on mount
  useEffect(() => {
    fetchFinancialOverview();
    fetchTransactions();
    fetchDoctorPayouts();
    fetchTechnicianPayouts();
    fetchHospitalPayouts();
    fetchFreelancePayouts();
  }, []);

  return {
    // Data
    platformRevenue,
    homeVisits,
    hospitalSubscriptions,
    freelanceTechnicians,
    doctorPayouts,
    technicianPayouts,
    loading,
    error,
    timeFilter,
    
    // Fetch functions
    fetchFinancialOverview,
    fetchTransactions,
    fetchDoctorPayouts,
    fetchTechnicianPayouts,
    fetchHospitalPayouts,
    fetchFreelancePayouts,
    
    // Utility functions
    filterDataByTimeRange,
    getRevenueChartData,
    getPieChartData,
    exportFinancialReport,
    setTimeFilter,
    
    // Clear error
    clearError: () => setError(null)
  };
};