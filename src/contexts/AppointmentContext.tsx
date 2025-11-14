import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  technicianId?: string;
  technicianName?: string;
  specialty: string;
  date: Date;
  time: string;
  location: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  type: 'home-visit' | 'clinic' | 'video-only';
  deviceReadings?: DeviceReading[];
  notes?: string;
  prescription?: string;
  callDuration?: number;
  paymentStatus?: 'pending' | 'paid' | 'failed';
  paymentAmount?: number;
  paymentMethod?: string;
  paymentDate?: Date;
}

export interface DeviceReading {
  deviceType: string;
  reading: string;
  timestamp: Date;
  unit: string;
}

interface AppointmentContextType {
  appointments: Appointment[];
  addAppointment: (appointment: Omit<Appointment, 'id'>) => void;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  getAppointmentsByUser: (userId: string, role: string) => Appointment[];
}

const AppointmentContext = createContext<AppointmentContextType | undefined>(undefined);

export const useAppointments = () => {
  const context = useContext(AppointmentContext);
  if (context === undefined) {
    throw new Error('useAppointments must be used within an AppointmentProvider');
  }
  return context;
};


export const AppointmentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadAppointments();
    } else {
      setAppointments([]);
      setLoading(false);
    }
  }, [user]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .order('startAt', { ascending: true });

      if (error) throw error;

      if (!appointments || appointments.length === 0) {
        setAppointments([]);
        return;
      }

      const patientIds = [...new Set(appointments.map(a => a.patientId))];
      const doctorIds = [...new Set(appointments.map(a => a.doctorId))];

      const { data: patientProfiles } = await supabase
        .from('user_profiles')
        .select('userId, fullName')
        .in('userId', patientIds);

      const { data: doctorProfiles } = await supabase
        .from('user_profiles')
        .select('userId, fullName')
        .in('userId', doctorIds);

      const { data: doctors } = await supabase
        .from('doctors')
        .select('id, specialty')
        .in('id', doctorIds);

      const patientProfilesMap = new Map(patientProfiles?.map(p => [p.userId, p]) || []);
      const doctorProfilesMap = new Map(doctorProfiles?.map(p => [p.userId, p]) || []);
      const doctorsMap = new Map(doctors?.map(d => [d.id, d]) || []);

      const formattedAppointments: Appointment[] = appointments.map((apt: any) => ({
        id: apt.id,
        patientId: apt.patientId,
        patientName: patientProfilesMap.get(apt.patientId)?.fullName || 'Unknown Patient',
        doctorId: apt.doctorId,
        doctorName: doctorProfilesMap.get(apt.doctorId)?.fullName || 'Unknown Doctor',
        technicianId: apt.technicianId,
        technicianName: apt.technicianId ? 'Technician' : undefined,
        specialty: doctorsMap.get(apt.doctorId)?.specialty || 'General',
        date: new Date(apt.startAt),
        time: new Date(apt.startAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        location: apt.locationType === 'HOME' ? (apt.addressId || 'Home') : 'Video Call',
        status: mapDbStatusToAppStatus(apt.status),
        type: apt.locationType === 'HOME' ? 'home-visit' : apt.locationType === 'REMOTE' ? 'video-only' : 'clinic',
        notes: apt.notes,
        paymentStatus: mapDbPaymentStatus(apt.paymentStatus),
      }));

      setAppointments(formattedAppointments);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const mapDbStatusToAppStatus = (dbStatus: string): 'scheduled' | 'in-progress' | 'completed' | 'cancelled' => {
    const statusMap: Record<string, 'scheduled' | 'in-progress' | 'completed' | 'cancelled'> = {
      'BOOKED': 'scheduled',
      'CONFIRMED': 'scheduled',
      'IN_PROGRESS': 'in-progress',
      'COMPLETED': 'completed',
      'CANCELLED': 'cancelled',
      'NO_SHOW': 'cancelled'
    };
    return statusMap[dbStatus] || 'scheduled';
  };

  const mapDbPaymentStatus = (dbStatus: string): 'pending' | 'paid' | 'failed' | undefined => {
    const statusMap: Record<string, 'pending' | 'paid' | 'failed'> = {
      'PENDING': 'pending',
      'PAID': 'paid',
      'FAILED': 'failed',
      'REFUNDED': 'failed'
    };
    return statusMap[dbStatus];
  };

  const addAppointment = async (appointment: Omit<Appointment, 'id'>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('You must be logged in to create an appointment');
      }

      const startAt = new Date(appointment.date);
      const [hours, minutes] = appointment.time.split(':').map(Number);
      startAt.setHours(hours, minutes, 0, 0);

      const endAt = new Date(startAt);
      endAt.setHours(startAt.getHours() + 1);

      const appointmentId = crypto.randomUUID();
      const now = new Date().toISOString();

      const appointmentData = {
        id: appointmentId,
        patientId: session.user.id,
        doctorId: appointment.doctorId,
        technicianId: appointment.technicianId || null,
        hospitalId: null,
        status: 'BOOKED',
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        locationType: appointment.type === 'home-visit' ? 'HOME' : 'REMOTE',
        addressId: null,
        notes: appointment.notes || null,
        createdByUserId: session.user.id,
        assignedAreaCode: null,
        source: 'APP',
        paymentStatus: appointment.type === 'home-visit' ? 'PENDING' : 'PAID',
        updatedAt: now,
        createdAt: now
      };

      console.log('=== CREATING APPOINTMENT ===');
      console.log('Session user ID:', session.user.id);
      console.log('Appointment data:', JSON.stringify(appointmentData, null, 2));

      const { data, error } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select()
        .single();

      if (error) {
        console.error('=== SUPABASE ERROR ===');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        console.error('Full error:', JSON.stringify(error, null, 2));

        alert(`Database Error: ${error.message}\nCode: ${error.code}\nDetails: ${error.details || 'none'}`);
        throw new Error(error.message || 'Failed to create appointment in database');
      }

      if (!data) {
        throw new Error('No data returned from appointment creation');
      }

      console.log('Appointment created successfully:', data);

      await loadAppointments();
      return data.id;
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      throw new Error(error?.message || 'An unexpected error occurred');
    }
  };

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    try {
      const dbUpdates: any = {};

      if (updates.status) {
        const statusMap: Record<string, string> = {
          'scheduled': 'CONFIRMED',
          'in-progress': 'IN_PROGRESS',
          'completed': 'COMPLETED',
          'cancelled': 'CANCELLED'
        };
        dbUpdates.status = statusMap[updates.status] || 'BOOKED';
      }

      if (updates.paymentStatus) {
        const paymentMap: Record<string, string> = {
          'pending': 'PENDING',
          'paid': 'PAID',
          'failed': 'FAILED'
        };
        dbUpdates.paymentStatus = paymentMap[updates.paymentStatus];
      }

      if (updates.notes) {
        dbUpdates.notes = updates.notes;
      }

      dbUpdates.updatedAt = new Date().toISOString();

      const { error } = await supabase
        .from('appointments')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      await loadAppointments();
    } catch (error) {
      console.error('Error updating appointment:', error);
      throw error;
    }
  };

  const getAppointmentsByUser = (userId: string, role: string) => {
    return appointments.filter(apt => {
      switch (role) {
        case 'patient':
          return apt.patientId === userId;
        case 'doctor':
          return apt.doctorId === userId;
        case 'technician':
          return apt.technicianId === userId;
        default:
          return true;
      }
    });
  };

  const value = {
    appointments,
    addAppointment,
    updateAppointment,
    getAppointmentsByUser,
  };

  return (
    <AppointmentContext.Provider value={value}>
      {children}
    </AppointmentContext.Provider>
  );
};