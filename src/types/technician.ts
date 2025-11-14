export interface TechnicianProfile {
  id: string;
  name: string;
  email: string;
  username: string;
  phone: string;
  nationalId: string;
  licenseNumber: string;
  employmentType: 'employed' | 'freelance';
  serviceArea: {
    governorate: string;
    cities: string[];
    radius: number; // in kilometers
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  assignedKits: string[];
  status: 'active' | 'inactive' | 'out-of-service';
  rating: number;
  totalVisits: number;
  joinDate: Date;
  lastLogin: Date;
  isVerified: boolean;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  bankDetails?: {
    accountNumber: string;
    bankName: string;
    accountHolderName: string;
  };
}

export interface TechnicianKit {
  id: string;
  kitNumber: string;
  serialNumber: string;
  assignedTechnicianId: string;
  status: 'in-service' | 'out-of-service' | 'maintenance';
  devices: TechnicianDevice[];
  lastMaintenance: Date;
  nextMaintenance: Date;
  batteryStatus: number;
  location: {
    governorate: string;
    city: string;
    address: string;
  };
  condition: 'excellent' | 'good' | 'needs-repair';
}

export interface TechnicianDevice {
  id: string;
  name: string;
  type: 'bluetooth' | 'usb' | 'wifi';
  category: 'vital-signs' | 'imaging' | 'audio' | 'visual';
  status: 'connected' | 'disconnected' | 'error' | 'testing';
  battery?: number;
  signalStrength?: number;
  lastUsed?: Date;
  manufacturer: string;
  model: string;
  serialNumber: string;
}

export interface TechnicianAppointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientAddress: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  scheduledDate: Date;
  scheduledTime: string;
  estimatedDuration: number; // in minutes
  status: 'assigned' | 'en-route' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'normal' | 'urgent' | 'emergency';
  requiredDevices: string[];
  notes?: string;
  completionNotes?: string;
  deviceReadings?: any[];
  travelTime?: number;
  actualStartTime?: Date;
  actualEndTime?: Date;
  paymentStatus: 'pending' | 'paid' | 'failed';
  technicianEarnings: number; // 30% of 750 LE = 225 LE
  travelTime?: number; // estimated travel time in minutes
}

export interface TechnicianEarnings {
  technicianId: string;
  period: {
    startDate: Date;
    endDate: Date;
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  };
  totalVisits: number;
  completedVisits: number;
  totalRevenue: number; // Total patient payments
  technicianEarnings: number; // 30% commission
  averagePerVisit: number;
  transactions: TechnicianTransaction[];
}

export interface TechnicianTransaction {
  id: string;
  appointmentId: string;
  patientName: string;
  doctorName: string;
  date: Date;
  patientPayment: number; // 750 LE
  technicianCommission: number; // 30% = 225 LE
  platformFee: number; // 70% = 525 LE
  status: 'pending' | 'paid' | 'processing';
  paymentDate?: Date;
}

export interface TechnicianNotification {
  id: string;
  technicianId: string;
  type: 'new-assignment' | 'appointment-update' | 'kit-maintenance' | 'payment' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  actionUrl?: string;
  metadata?: any;
}