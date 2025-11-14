export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'doctor' | 'technician' | 'hospital' | 'freelance-tech' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  city: string;
  governorate: string;
  joinDate: string;
  phone?: string;
  lastLogin: string;
  
  // Patient specific
  totalAppointments?: number;
  totalSpent?: number;
  medicalHistory?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  
  // Doctor specific
  specialty?: string;
  license?: string;
  experience?: number;
  rating?: number;
  totalConsultations?: number;
  totalEarnings?: number;
  bio?: string;
  
  // Technician specific
  assignedKits?: string[];
  totalVisits?: number;
  employmentType?: 'full-time' | 'freelance';
  
  // Hospital specific
  subscriptionPlan?: string;
  subscriptionFee?: number;
  totalDoctors?: number;
}

export interface MedicalKit {
  id: string;
  kitNumber: string;
  serialNumber: string;
  status: 'available' | 'deployed' | 'maintenance';
  technician: string | null;
  hospital: string | null;
  city: string;
  governorate: string;
  address: string;
  devices: string[];
  lastMaintenance: string;
  nextMaintenance: string;
  batteryStatus: number;
  condition: 'excellent' | 'good' | 'needs-repair';
  totalVisits?: number;
  uptime?: string;
}

export interface FinancialData {
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  consultationRevenue: number;
  subscriptionRevenue: number;
  freelanceRevenue: number;
  revenueGrowth: number;
  monthlyGrowth: number;
  weeklyGrowth: number;
}

export interface SystemActivity {
  id: string;
  action: string;
  user: string;
  time: string;
  type: 'user' | 'kit' | 'payment' | 'subscription' | 'maintenance';
  status: 'success' | 'warning' | 'error';
  details?: any;
}

export interface AdminStats {
  totalUsers: number;
  activeDoctors: number;
  totalKits: number;
  deployedKits: number;
  availableKits: number;
  maintenanceKits: number;
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
}

export interface RevenueChartData {
  month: string;
  consultations: number;
  subscriptions: number;
  freelance: number;
}

export interface PieChartData {
  name: string;
  value: number;
  color: string;
}