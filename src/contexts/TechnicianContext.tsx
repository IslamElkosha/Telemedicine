import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { TechnicianProfile, TechnicianKit, TechnicianAppointment, TechnicianEarnings, TechnicianNotification } from '../types/technician';

interface TechnicianContextType {
  profile: TechnicianProfile | null;
  assignedKits: TechnicianKit[];
  appointments: TechnicianAppointment[];
  earnings: TechnicianEarnings | null;
  notifications: TechnicianNotification[];
  unreadNotifications: number;
  
  // Authentication
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: TechnicianRegistrationData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  
  // Profile management
  updateProfile: (updates: Partial<TechnicianProfile>) => Promise<{ success: boolean; error?: string }>;
  updateServiceArea: (serviceArea: TechnicianProfile['serviceArea']) => Promise<{ success: boolean; error?: string }>;
  
  // Kit management
  updateKitStatus: (kitId: string, status: 'in-service' | 'out-of-service') => Promise<{ success: boolean; error?: string }>;
  testDevice: (kitId: string, deviceId: string) => Promise<{ success: boolean; error?: string }>;
  connectDevice: (kitId: string, deviceId: string) => Promise<{ success: boolean; error?: string }>;
  disconnectDevice: (kitId: string, deviceId: string) => Promise<{ success: boolean; error?: string }>;
  
  // Appointment management
  updateAppointmentStatus: (appointmentId: string, status: TechnicianAppointment['status']) => Promise<{ success: boolean; error?: string }>;
  addAppointmentNotes: (appointmentId: string, notes: string) => Promise<{ success: boolean; error?: string }>;
  submitDeviceReadings: (appointmentId: string, readings: any[]) => Promise<{ success: boolean; error?: string }>;
  
  // Notifications
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  
  // Financial
  fetchEarnings: (period: 'daily' | 'weekly' | 'monthly' | 'yearly') => Promise<void>;
  
  loading: boolean;
  error: string | null;
}

export interface TechnicianRegistrationData {
  name: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  phone: string;
  nationalId: string;
  licenseNumber: string;
  employmentType: 'employed' | 'freelance';
  serviceArea: {
    governorate: string;
    cities: string[];
    radius: number;
  };
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
}

const TechnicianContext = createContext<TechnicianContextType | undefined>(undefined);

export const useTechnician = () => {
  const context = useContext(TechnicianContext);
  if (context === undefined) {
    throw new Error('useTechnician must be used within a TechnicianProvider');
  }
  return context;
};

// Mock data
const mockTechnicians: TechnicianProfile[] = [
  {
    id: 'tech-001',
    name: 'Mike Wilson',
    email: 'mike.wilson@telemedcare.com',
    username: 'mike_wilson',
    phone: '+20 102 345 6789',
    nationalId: '29012345678901',
    licenseNumber: 'TECH-2024-001',
    employmentType: 'employed',
    serviceArea: {
      governorate: 'cairo',
      cities: ['cairo-city', 'nasr-city', 'helwan'],
      radius: 15,
      coordinates: { lat: 30.0444, lng: 31.2357 }
    },
    assignedKits: ['KIT-001', 'KIT-003'],
    status: 'active',
    rating: 4.8,
    totalVisits: 156,
    joinDate: new Date('2024-01-15'),
    lastLogin: new Date(),
    isVerified: true,
    emergencyContact: {
      name: 'Sarah Wilson',
      phone: '+20 101 234 5678',
      relationship: 'spouse'
    },
    bankDetails: {
      accountNumber: '1234567890',
      bankName: 'National Bank of Egypt',
      accountHolderName: 'Mike Wilson'
    }
  }
];

const mockKits: TechnicianKit[] = [
  {
    id: 'KIT-001',
    kitNumber: 'TMC-KIT-001',
    serialNumber: 'TMC-2025-001',
    assignedTechnicianId: 'tech-001',
    status: 'in-service',
    devices: [
      {
        id: 'dev-001',
        name: 'Blood Pressure Monitor',
        type: 'bluetooth',
        category: 'vital-signs',
        status: 'connected',
        battery: 85,
        signalStrength: 92,
        manufacturer: 'MedTech',
        model: 'BP-Pro-2024',
        serialNumber: 'BP-001-2024'
      },
      {
        id: 'dev-002',
        name: 'Digital Stethoscope',
        type: 'bluetooth',
        category: 'audio',
        status: 'connected',
        battery: 78,
        signalStrength: 88,
        manufacturer: 'AudioMed',
        model: 'Stetho-Digital-X1',
        serialNumber: 'ST-002-2024'
      },
      {
        id: 'dev-003',
        name: 'Pulse Oximeter',
        type: 'usb',
        category: 'vital-signs',
        status: 'disconnected',
        manufacturer: 'VitalSigns Inc',
        model: 'OX-Monitor-Pro',
        serialNumber: 'OX-003-2024'
      }
    ],
    lastMaintenance: new Date('2025-01-01'),
    nextMaintenance: new Date('2025-04-01'),
    batteryStatus: 82,
    location: {
      governorate: 'cairo',
      city: 'cairo-city',
      address: 'Medical Center, Nasr City'
    },
    condition: 'excellent'
  }
];

export const TechnicianProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [assignedKits, setAssignedKits] = useState<TechnicianKit[]>([]);
  const [appointments, setAppointments] = useState<TechnicianAppointment[]>([]);
  const [earnings, setEarnings] = useState<TechnicianEarnings | null>(null);
  const [notifications, setNotifications] = useState<TechnicianNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unreadNotifications = notifications.filter(n => !n.isRead).length;

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Find technician by username or email
      const technician = mockTechnicians.find(t => 
        t.username === username || t.email === username
      );
      
      if (!technician) {
        return { success: false, error: 'Invalid username or password' };
      }
      
      // Mock password validation (in real app, compare hashed passwords)
      if (password !== 'tech123') {
        return { success: false, error: 'Invalid username or password' };
      }
      
      setProfile(technician);
      
      // Load technician's data
      const technicianKits = mockKits.filter(kit => 
        technician.assignedKits.includes(kit.id)
      );
      setAssignedKits(technicianKits);
      
      // Load appointments
      await fetchAppointments(technician.id);
      
      // Load notifications
      await fetchNotifications(technician.id);
      
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Login failed. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: TechnicianRegistrationData): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Validate unique constraints
      const existingTechnician = mockTechnicians.find(t => 
        t.email === data.email || 
        t.username === data.username || 
        t.nationalId === data.nationalId ||
        t.licenseNumber === data.licenseNumber
      );
      
      if (existingTechnician) {
        if (existingTechnician.email === data.email) {
          return { success: false, error: 'Email address is already registered' };
        }
        if (existingTechnician.username === data.username) {
          return { success: false, error: 'Username is already taken' };
        }
        if (existingTechnician.nationalId === data.nationalId) {
          return { success: false, error: 'National ID is already registered' };
        }
        if (existingTechnician.licenseNumber === data.licenseNumber) {
          return { success: false, error: 'License number is already registered' };
        }
      }
      
      // Create new technician profile
      const newTechnician: TechnicianProfile = {
        id: `tech-${Date.now()}`,
        ...data,
        assignedKits: [],
        status: 'active',
        rating: 0,
        totalVisits: 0,
        joinDate: new Date(),
        lastLogin: new Date(),
        isVerified: false
      };
      
      mockTechnicians.push(newTechnician);
      setProfile(newTechnician);
      
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Registration failed. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setProfile(null);
    setAssignedKits([]);
    setAppointments([]);
    setEarnings(null);
    setNotifications([]);
    setError(null);
  };

  const updateProfile = async (updates: Partial<TechnicianProfile>): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (profile) {
        const updatedProfile = { ...profile, ...updates };
        setProfile(updatedProfile);
        
        // Update in mock database
        const index = mockTechnicians.findIndex(t => t.id === profile.id);
        if (index !== -1) {
          mockTechnicians[index] = updatedProfile;
        }
      }
      
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Failed to update profile' };
    } finally {
      setLoading(false);
    }
  };

  const updateServiceArea = async (serviceArea: TechnicianProfile['serviceArea']): Promise<{ success: boolean; error?: string }> => {
    return updateProfile({ serviceArea });
  };

  const updateKitStatus = async (kitId: string, status: 'in-service' | 'out-of-service'): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setAssignedKits(prev => prev.map(kit => 
        kit.id === kitId ? { ...kit, status } : kit
      ));
      
      // If marking as out-of-service, reassign pending appointments
      if (status === 'out-of-service') {
        await reassignPendingAppointments(kitId);
      }
      
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Failed to update kit status' };
    } finally {
      setLoading(false);
    }
  };

  const testDevice = async (kitId: string, deviceId: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate device test
      const success = Math.random() > 0.1; // 90% success rate
      
      setAssignedKits(prev => prev.map(kit => 
        kit.id === kitId ? {
          ...kit,
          devices: kit.devices.map(device => 
            device.id === deviceId ? {
              ...device,
              status: success ? 'connected' : 'error',
              lastUsed: new Date()
            } : device
          )
        } : kit
      ));
      
      return { 
        success, 
        error: success ? undefined : 'Device test failed. Please check connections.' 
      };
    } catch (err) {
      return { success: false, error: 'Device test failed' };
    } finally {
      setLoading(false);
    }
  };

  const connectDevice = async (kitId: string, deviceId: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setAssignedKits(prev => prev.map(kit => 
        kit.id === kitId ? {
          ...kit,
          devices: kit.devices.map(device => 
            device.id === deviceId ? {
              ...device,
              status: 'connected',
              signalStrength: Math.floor(Math.random() * 40) + 60,
              lastUsed: new Date()
            } : device
          )
        } : kit
      ));
      
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Failed to connect device' };
    } finally {
      setLoading(false);
    }
  };

  const disconnectDevice = async (kitId: string, deviceId: string): Promise<{ success: boolean; error?: string }> => {
    setAssignedKits(prev => prev.map(kit => 
      kit.id === kitId ? {
        ...kit,
        devices: kit.devices.map(device => 
          device.id === deviceId ? {
            ...device,
            status: 'disconnected',
            signalStrength: 0
          } : device
        )
      } : kit
    ));
    
    return { success: true };
  };

  const updateAppointmentStatus = async (appointmentId: string, status: TechnicianAppointment['status']): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setAppointments(prev => prev.map(apt => 
        apt.id === appointmentId ? {
          ...apt,
          status,
          actualStartTime: status === 'in-progress' ? new Date() : apt.actualStartTime,
          actualEndTime: status === 'completed' ? new Date() : apt.actualEndTime
        } : apt
      ));
      
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Failed to update appointment status' };
    } finally {
      setLoading(false);
    }
  };

  const addAppointmentNotes = async (appointmentId: string, notes: string): Promise<{ success: boolean; error?: string }> => {
    setAppointments(prev => prev.map(apt => 
      apt.id === appointmentId ? { ...apt, completionNotes: notes } : apt
    ));
    
    return { success: true };
  };

  const submitDeviceReadings = async (appointmentId: string, readings: any[]): Promise<{ success: boolean; error?: string }> => {
    setAppointments(prev => prev.map(apt => 
      apt.id === appointmentId ? { ...apt, deviceReadings: readings } : apt
    ));
    
    return { success: true };
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prev => prev.map(notification => 
      notification.id === notificationId ? { ...notification, isRead: true } : notification
    ));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(notification => ({ ...notification, isRead: true })));
  };

  const fetchAppointments = async (technicianId: string) => {
    // Mock appointments data
    const mockAppointments: TechnicianAppointment[] = [
      {
        id: 'apt-001',
        patientId: 'pat-001',
        patientName: 'John Smith',
        patientPhone: '+20 100 123 4567',
        patientAddress: '123 Main St, Nasr City, Cairo',
        doctorId: 'doc-001',
        doctorName: 'Dr. Sarah Johnson',
        specialty: 'Cardiology',
        scheduledDate: new Date(2025, 0, 21),
        scheduledTime: '14:00',
        estimatedDuration: 60,
        status: 'assigned',
        priority: 'normal',
        requiredDevices: ['Blood Pressure Monitor', 'Digital Stethoscope', 'ECG Device'],
        paymentStatus: 'paid',
        technicianEarnings: 225,
        travelTime: 15
      },
      {
        id: 'apt-002',
        patientId: 'pat-002',
        patientName: 'Mary Johnson',
        patientPhone: '+20 101 234 5678',
        patientAddress: '456 Health Ave, Helwan, Cairo',
        doctorId: 'doc-002',
        doctorName: 'Dr. Michael Chen',
        specialty: 'Internal Medicine',
        scheduledDate: new Date(2025, 0, 21),
        scheduledTime: '16:30',
        estimatedDuration: 45,
        status: 'assigned',
        priority: 'urgent',
        requiredDevices: ['Blood Pressure Monitor', 'Pulse Oximeter'],
        paymentStatus: 'paid',
        technicianEarnings: 225,
        travelTime: 20
      },
      {
        id: 'apt-003',
        patientId: 'pat-003',
        patientName: 'Ahmed Hassan',
        patientPhone: '+20 102 456 7890',
        patientAddress: '789 Medical St, Maadi, Cairo',
        doctorId: 'doc-003',
        doctorName: 'Dr. Emily Wilson',
        specialty: 'Dermatology',
        scheduledDate: new Date(2025, 0, 22),
        scheduledTime: '10:00',
        estimatedDuration: 30,
        status: 'assigned',
        priority: 'normal',
        requiredDevices: ['Digital Camera', 'Dermatoscope'],
        paymentStatus: 'paid',
        technicianEarnings: 225,
        travelTime: 25
      }
    ];
    
    setAppointments(mockAppointments);
  };

  const fetchNotifications = async (technicianId: string) => {
    const mockNotifications: TechnicianNotification[] = [
      {
        id: 'notif-001',
        technicianId,
        type: 'new-assignment',
        title: 'New Appointment Assigned',
        message: 'You have been assigned a new appointment with John Smith for tomorrow at 2:00 PM',
        isRead: false,
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
        actionUrl: '/technician/appointments'
      },
      {
        id: 'notif-002',
        technicianId,
        type: 'kit-maintenance',
        title: 'Kit Maintenance Due',
        message: 'Your kit KIT-001 is due for maintenance next week',
        isRead: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    ];
    
    setNotifications(mockNotifications);
  };

  const fetchEarnings = async (period: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    setLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Calculate earnings based on completed appointments
      const completedAppointments = appointments.filter(apt => 
        apt.status === 'completed' && apt.paymentStatus === 'paid'
      );
      
      const totalEarnings = completedAppointments.reduce((sum, apt) => sum + apt.technicianEarnings, 0);
      const totalRevenue = completedAppointments.length * 750; // 750 LE per visit
      
      const mockEarnings: TechnicianEarnings = {
        technicianId: profile?.id || '',
        period: {
          startDate: new Date(2025, 0, 1),
          endDate: new Date(2025, 0, 31),
          type: period
        },
        totalVisits: completedAppointments.length,
        completedVisits: completedAppointments.length,
        totalRevenue,
        technicianEarnings: totalEarnings,
        averagePerVisit: 225,
        transactions: completedAppointments.map(apt => ({
          id: `trans-${apt.id}`,
          appointmentId: apt.id,
          patientName: apt.patientName,
          doctorName: apt.doctorName,
          date: apt.scheduledDate,
          patientPayment: 750,
          technicianCommission: 225,
          platformFee: 525,
          status: 'paid' as const,
          paymentDate: new Date()
        }))
      };
      
      setEarnings(mockEarnings);
    } catch (err) {
      setError('Failed to fetch earnings data');
    } finally {
      setLoading(false);
    }
  };

  const reassignPendingAppointments = async (kitId: string) => {
    // Logic to reassign appointments when kit goes out of service
    const pendingAppointments = appointments.filter(apt => 
      apt.status === 'assigned' && 
      assignedKits.find(kit => kit.id === kitId)
    );
    
    // In a real app, this would call the backend to reassign appointments
    console.log(`Reassigning ${pendingAppointments.length} appointments due to kit ${kitId} going out of service`);
  };

  const value = {
    profile,
    assignedKits,
    appointments,
    earnings,
    notifications,
    unreadNotifications,
    login,
    register,
    logout,
    updateProfile,
    updateServiceArea,
    updateKitStatus,
    testDevice,
    connectDevice,
    disconnectDevice,
    updateAppointmentStatus,
    addAppointmentNotes,
    submitDeviceReadings,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    fetchEarnings,
    loading,
    error
  };

  return (
    <TechnicianContext.Provider value={value}>
      {children}
    </TechnicianContext.Provider>
  );
};