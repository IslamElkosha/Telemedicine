import { useState, useEffect } from 'react';
import { AdminUser, MedicalKit, FinancialData, SystemActivity, AdminStats } from '../types/admin';

// Custom hook for managing admin dashboard data
export const useAdminData = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [kits, setKits] = useState<MedicalKit[]>([]);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [activities, setActivities] = useState<SystemActivity[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulate API calls for data fetching
  const fetchUsers = async (filters?: { role?: string; search?: string }) => {
    setLoading(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data would be replaced with actual API call
      const mockUsers: AdminUser[] = [
        {
          id: '1',
          name: 'John Smith',
          email: 'patient@test.com',
          role: 'patient',
          status: 'active',
          city: 'Cairo',
          governorate: 'cairo',
          joinDate: '2024-01-15',
          phone: '+20 100 123 4567',
          lastLogin: '2025-01-20',
          totalAppointments: 5,
          totalSpent: 3750
        },
        {
          id: '2',
          name: 'Dr. Sarah Johnson',
          email: 'doctor@test.com',
          role: 'doctor',
          status: 'active',
          city: 'Alexandria',
          governorate: 'alexandria',
          joinDate: '2024-01-10',
          phone: '+20 101 234 5678',
          lastLogin: '2025-01-20',
          specialty: 'Cardiology',
          license: 'MD12345',
          experience: 10,
          rating: 4.9,
          totalConsultations: 89,
          totalEarnings: 33375
        },
        {
          id: '3',
          name: 'Mike Wilson',
          email: 'tech@test.com',
          role: 'technician',
          status: 'active',
          city: 'Giza',
          governorate: 'giza',
          joinDate: '2024-01-20',
          phone: '+20 102 345 6789',
          lastLogin: '2025-01-20',
          assignedKits: ['KIT-001', 'KIT-003'],
          totalVisits: 45,
          employmentType: 'full-time'
        },
        {
          id: '4',
          name: 'City General Hospital',
          email: 'hospital@test.com',
          role: 'hospital',
          status: 'active',
          city: 'Cairo',
          governorate: 'cairo',
          joinDate: '2024-01-05',
          phone: '+20 103 456 7890',
          lastLogin: '2025-01-19',
          subscriptionPlan: 'Premium',
          subscriptionFee: 5000,
          totalDoctors: 15
        },
        {
          id: '5',
          name: 'Alex Thompson',
          email: 'freelance@test.com',
          role: 'freelance-tech',
          status: 'active',
          city: 'Mansoura',
          governorate: 'dakahlia',
          joinDate: '2024-02-01',
          phone: '+20 104 567 8901',
          lastLogin: '2025-01-20',
          assignedKits: ['KIT-007'],
          totalVisits: 23,
          employmentType: 'freelance'
        }
      ];
      
      let filteredUsers = mockUsers;
      
      if (filters?.role && filters.role !== 'all') {
        filteredUsers = filteredUsers.filter(user => user.role === filters.role);
      }
      
      if (filters?.search) {
        filteredUsers = filteredUsers.filter(user => 
          user.name.toLowerCase().includes(filters.search!.toLowerCase()) ||
          user.email.toLowerCase().includes(filters.search!.toLowerCase())
        );
      }
      
      setUsers(filteredUsers);
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchKits = async (filters?: { status?: string; city?: string }) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mock data - replace with actual API call
      const mockKits: MedicalKit[] = [
        {
          id: 'KIT-001',
          kitNumber: 'KIT-001',
          serialNumber: 'TMC-2025-001',
          status: 'deployed',
          technician: 'Mike Wilson',
          hospital: null,
          city: 'Cairo',
          governorate: 'cairo',
          address: '123 Medical Center St, Nasr City',
          devices: ['Blood Pressure Monitor', 'Pulse Oximeter', 'Digital Thermometer', 'Digital Stethoscope'],
          lastMaintenance: '2025-01-15',
          nextMaintenance: '2025-04-15',
          batteryStatus: 85,
          condition: 'excellent'
        },
        {
          id: 'KIT-002',
          kitNumber: 'KIT-002',
          serialNumber: 'TMC-2025-002',
          status: 'available',
          technician: null,
          hospital: null,
          city: 'Alexandria',
          governorate: 'alexandria',
          address: 'Medical Depot, Alexandria',
          devices: ['ECG Device', 'Ultrasound Probe', 'Otoscope', 'Ophthalmoscope'],
          lastMaintenance: '2025-01-10',
          nextMaintenance: '2025-04-10',
          batteryStatus: 92,
          condition: 'excellent'
        },
        {
          id: 'KIT-003',
          kitNumber: 'KIT-003',
          serialNumber: 'TMC-2025-003',
          status: 'maintenance',
          technician: null,
          hospital: null,
          city: 'Giza',
          governorate: 'giza',
          address: 'Maintenance Center, Giza',
          devices: ['Glucometer', 'Peak Flow Meter', 'Digital Thermometer'],
          lastMaintenance: '2025-01-20',
          nextMaintenance: '2025-04-20',
          batteryStatus: 45,
          condition: 'needs-repair'
        },
        {
          id: 'KIT-004',
          kitNumber: 'KIT-004',
          serialNumber: 'TMC-2025-004',
          status: 'deployed',
          technician: null,
          hospital: 'City General Hospital',
          city: 'Mansoura',
          governorate: 'dakahlia',
          address: 'City General Hospital, Mansoura',
          devices: ['Blood Pressure Monitor', 'ECG Device', 'Digital Stethoscope', 'Pulse Oximeter', 'Ultrasound Probe'],
          lastMaintenance: '2025-01-12',
          nextMaintenance: '2025-04-12',
          batteryStatus: 78,
          condition: 'good'
        },
        {
          id: 'KIT-005',
          kitNumber: 'KIT-005',
          serialNumber: 'TMC-2025-005',
          status: 'available',
          technician: null,
          hospital: null,
          city: 'Zagazig',
          governorate: 'sharqia',
          address: 'Regional Medical Center, Zagazig',
          devices: ['Digital Thermometer', 'Otoscope', 'Glucometer'],
          lastMaintenance: '2025-01-18',
          nextMaintenance: '2025-04-18',
          batteryStatus: 95,
          condition: 'excellent'
        }
      ];
      
      let filteredKits = mockKits;
      
      if (filters?.status && filters.status !== 'all') {
        filteredKits = filteredKits.filter(kit => kit.status === filters.status);
      }
      
      if (filters?.city) {
        filteredKits = filteredKits.filter(kit => 
          kit.city.toLowerCase().includes(filters.city!.toLowerCase())
        );
      }
      
      setKits(filteredKits);
    } catch (err) {
      setError('Failed to fetch kits');
    } finally {
      setLoading(false);
    }
  };

  const fetchFinancialData = async (period?: 'week' | 'month' | 'year') => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Mock financial data - replace with actual API call
      const mockFinancialData: FinancialData = {
        totalRevenue: 125000,
        monthlyRevenue: 45000,
        weeklyRevenue: 12000,
        consultationRevenue: 35000,
        subscriptionRevenue: 8000,
        freelanceRevenue: 2000,
        revenueGrowth: 12.5,
        monthlyGrowth: 8.3,
        weeklyGrowth: 15.2
      };
      
      setFinancialData(mockFinancialData);
    } catch (err) {
      setError('Failed to fetch financial data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemActivities = async (limit: number = 10) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Mock activities - replace with actual API call
      const mockActivities: SystemActivity[] = [
        {
          id: '1',
          action: 'New doctor registration',
          user: 'Dr. Sarah Johnson',
          time: '5 minutes ago',
          type: 'user',
          status: 'success'
        },
        // ... more mock activities
      ];
      
      setActivities(mockActivities.slice(0, limit));
    } catch (err) {
      setError('Failed to fetch system activities');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock stats - replace with actual API call
      const mockStats: AdminStats = {
        totalUsers: 156,
        activeDoctors: 23,
        totalKits: 45,
        deployedKits: 28,
        availableKits: 12,
        maintenanceKits: 5,
        totalRevenue: 14250, // Updated to match consultation data
        monthlyRevenue: 14250,
        weeklyRevenue: 3750
      };
      
      setStats(mockStats);
    } catch (err) {
      setError('Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  // CRUD operations for users
  const createUser = async (userData: Partial<AdminUser>) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newUser: AdminUser = {
        id: Date.now().toString(),
        ...userData,
        status: 'active',
        joinDate: new Date().toISOString().split('T')[0],
        lastLogin: 'Never'
      } as AdminUser;
      
      setUsers(prev => [...prev, newUser]);
      return { success: true, user: newUser };
    } catch (err) {
      setError('Failed to create user');
      return { success: false, error: 'Failed to create user' };
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userId: string, updates: Partial<AdminUser>) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, ...updates } : user
      ));
      
      return { success: true };
    } catch (err) {
      setError('Failed to update user');
      return { success: false, error: 'Failed to update user' };
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setUsers(prev => prev.filter(user => user.id !== userId));
      return { success: true };
    } catch (err) {
      setError('Failed to delete user');
      return { success: false, error: 'Failed to delete user' };
    } finally {
      setLoading(false);
    }
  };

  // CRUD operations for kits
  const createKit = async (kitData: Partial<MedicalKit>) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Check for unique kit number
      const existingKit = kits.find(kit => kit.kitNumber === kitData.kitNumber);
      if (existingKit) {
        throw new Error('Kit number already exists');
      }
      
      const newKit: MedicalKit = {
        id: `KIT-${String(kits.length + 1).padStart(3, '0')}`,
        ...kitData,
        lastMaintenance: new Date().toISOString().split('T')[0],
        nextMaintenance: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        batteryStatus: 100,
        condition: 'excellent'
      } as MedicalKit;
      
      setKits(prev => [...prev, newKit]);
      return { success: true, kit: newKit };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create kit';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const updateKit = async (kitId: string, updates: Partial<MedicalKit>) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setKits(prev => prev.map(kit => 
        kit.id === kitId ? { ...kit, ...updates } : kit
      ));
      
      return { success: true };
    } catch (err) {
      setError('Failed to update kit');
      return { success: false, error: 'Failed to update kit' };
    } finally {
      setLoading(false);
    }
  };

  const deleteKit = async (kitId: string) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setKits(prev => prev.filter(kit => kit.id !== kitId));
      return { success: true };
    } catch (err) {
      setError('Failed to delete kit');
      return { success: false, error: 'Failed to delete kit' };
    } finally {
      setLoading(false);
    }
  };

  // Export functions
  const exportUsers = async (format: 'csv' | 'pdf' = 'csv') => {
    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (format === 'csv') {
        const csvContent = [
          'Name,Email,Role,Status,City,Join Date',
          ...users.map(user => 
            `${user.name},${user.email},${user.role},${user.status},${user.city},${user.joinDate}`
          )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
      
      return { success: true };
    } catch (err) {
      setError('Failed to export data');
      return { success: false, error: 'Failed to export data' };
    }
  };

  const exportFinancialReport = async (format: 'csv' | 'pdf' = 'csv') => {
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (format === 'csv' && financialData) {
        const csvContent = [
          'Metric,Value',
          `Total Revenue,${financialData.totalRevenue}`,
          `Monthly Revenue,${financialData.monthlyRevenue}`,
          `Weekly Revenue,${financialData.weeklyRevenue}`,
          `Consultation Revenue,${financialData.consultationRevenue}`,
          `Subscription Revenue,${financialData.subscriptionRevenue}`,
          `Freelance Revenue,${financialData.freelanceRevenue}`
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
      
      return { success: true };
    } catch (err) {
      setError('Failed to export financial report');
      return { success: false, error: 'Failed to export financial report' };
    }
  };

  return {
    // Data
    users,
    kits,
    financialData,
    activities,
    stats,
    loading,
    error,
    
    // Fetch functions
    fetchUsers,
    fetchKits,
    fetchFinancialData,
    fetchSystemActivities,
    fetchStats,
    
    // CRUD operations
    createUser,
    updateUser,
    deleteUser,
    createKit,
    updateKit,
    deleteKit,
    
    // Export functions
    exportUsers,
    exportFinancialReport,
    
    // Utility functions
    clearError: () => setError(null)
  };
};