import { z } from 'zod';

// Enums
export enum UserRole {
  ADMIN = 'ADMIN',
  PLATFORM_OPS = 'PLATFORM_OPS',
  HOSPITAL_ADMIN = 'HOSPITAL_ADMIN',
  DOCTOR = 'DOCTOR',
  TECHNICIAN = 'TECHNICIAN',
  FREELANCE_TECHNICIAN = 'FREELANCE_TECHNICIAN',
  PATIENT = 'PATIENT'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION'
}

export enum AppointmentStatus {
  BOOKED = 'BOOKED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW'
}

export enum LocationType {
  HOSPITAL = 'HOSPITAL',
  HOME = 'HOME',
  REMOTE = 'REMOTE'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED'
}

export enum DeviceType {
  ECG = 'ECG',
  SPO2 = 'SPO2',
  BP = 'BP',
  THERMO = 'THERMO',
  GLUCO = 'GLUCO',
  STETH = 'STETH',
  ULTRASOUND = 'ULTRASOUND',
  OTHER = 'OTHER'
}

export enum KitStatus {
  ASSIGNED = 'ASSIGNED',
  IN_STOCK = 'IN_STOCK',
  MAINTENANCE = 'MAINTENANCE'
}

export enum TechnicianAvailability {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  BUSY = 'BUSY'
}

// DTOs
export const LoginDto = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const RegisterDto = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole),
  specialty: z.string().optional(),
  licenseNo: z.string().optional(),
  hospitalId: z.string().optional()
});

export const UpdateProfileDto = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  dob: z.string().datetime().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional()
});

export const CreateAppointmentDto = z.object({
  doctorId: z.string(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  locationType: z.nativeEnum(LocationType),
  addressId: z.string().optional(),
  notes: z.string().optional(),
  assignedAreaCode: z.string().optional()
});

export const UpdateAppointmentDto = z.object({
  status: z.nativeEnum(AppointmentStatus).optional(),
  notes: z.string().optional(),
  technicianId: z.string().optional()
});

export const CreateReadingDto = z.object({
  deviceId: z.string(),
  type: z.string(),
  payload: z.record(z.any()),
  capturedAt: z.string().datetime().optional()
});

export const UpdateTechnicianDto = z.object({
  coverageAreas: z.array(z.string()).optional(),
  availability: z.nativeEnum(TechnicianAvailability).optional(),
  currentGeo: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional()
});

export const PairDeviceDto = z.object({
  pairingCode: z.string(),
  kitId: z.string().optional()
});

// Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  status: UserStatus;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  profile?: UserProfile;
}

export interface UserProfile {
  userId: string;
  fullName: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  dob?: Date;
  avatarUrl?: string;
  nationalId?: string;
  locale: string;
  timezone: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  technicianId?: string;
  hospitalId?: string;
  status: AppointmentStatus;
  startAt: Date;
  endAt: Date;
  locationType: LocationType;
  addressId?: string;
  notes?: string;
  paymentStatus: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
  patient?: User;
  doctor?: User;
  technician?: User;
  address?: Address;
}

export interface Address {
  id: string;
  userId?: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  country: string;
  postalCode?: string;
  geo?: { lat: number; lng: number };
  isPrimary: boolean;
}

export interface Session {
  id: string;
  appointmentId: string;
  startedAt: Date;
  endedAt?: Date;
  status: 'OPEN' | 'CLOSED';
  summary?: string;
  readings?: Reading[];
}

export interface Reading {
  id: string;
  sessionId: string;
  deviceId: string;
  type: string;
  payload: Record<string, any>;
  capturedAt: Date;
  fhirBundle?: Record<string, any>;
}

export interface Device {
  id: string;
  type: DeviceType;
  make: string;
  model: string;
  serial: string;
  pairingCode: string;
  ownerTechnicianId?: string;
  assignedKitId?: string;
  status: 'ACTIVE' | 'RETIRED';
  fhirMapping?: Record<string, any>;
}

export interface Kit {
  id: string;
  code: string;
  technicianId?: string;
  hospitalId?: string;
  status: KitStatus;
  devices?: Device[];
}

export interface Technician {
  id: string;
  userId: string;
  isFreelance: boolean;
  coverageAreas: string[];
  kitId?: string;
  rating?: number;
  availability: TechnicianAvailability;
  currentGeo?: { lat: number; lng: number };
  lastSeenAt?: Date;
  user?: User;
  kit?: Kit;
}

// Socket.IO event types
export interface SocketEvents {
  // Client to server
  'join-room': (room: string) => void;
  'leave-room': (room: string) => void;
  'reading:submit': (data: { sessionId: string; reading: any }) => void;
  'appointment:update-status': (data: { appointmentId: string; status: AppointmentStatus }) => void;

  // Server to client
  'reading:new': (data: { sessionId: string; reading: Reading }) => void;
  'appointment:status-changed': (data: { appointmentId: string; status: AppointmentStatus }) => void;
  'notification:new': (data: { notification: any }) => void;
  'technician:location-updated': (data: { technicianId: string; location: { lat: number; lng: number } }) => void;
}