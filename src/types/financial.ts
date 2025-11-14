export interface PlatformRevenue {
  totalRevenue: number;
  totalPatientPayments: number;
  totalPayouts: number;
  revenueStreams: {
    homeVisits: number;
    hospitalSubscriptions: number;
    freelanceSubscriptions: number;
  };
  metrics: {
    totalConsultations: number;
    averageRevenuePerConsultation: number;
    totalDoctorPayouts: number;
    totalTechnicianPayouts: number;
    totalFreelancePayouts: number;
    totalHospitalPayouts: number;
  };
}

export interface HomeVisitTransaction {
  id: string;
  patientName: string;
  doctorName: string;
  technicianName: string;
  kitId: string;
  date: Date;
  paymentAmount: number; // Always 750 LE
  status: 'paid' | 'pending' | 'failed';
  platformRevenue: number; // 30% of 750 LE = 225 LE
  doctorPayout: number; // 50% of 750 LE = 375 LE
  technicianPayout: number; // 30% of 750 LE = 225 LE (for employed) or 15% = 112.5 LE (for freelance)
  technicianType: 'employed' | 'freelance';
  hospitalId?: string;
  hospitalName?: string;
}

export interface HospitalSubscription {
  id: string;
  hospitalName: string;
  subscriptionPlan: 'Basic' | 'Premium' | 'Enterprise';
  yearlyFee: number; // 3000 LE
  lastPaymentDate: Date;
  nextPaymentDate: Date;
  status: 'active' | 'expired' | 'pending';
  assignedKits: string[];
  consultations: HospitalConsultation[];
  totalRevenue: number; // Subscription + 10% from consultations
}

export interface HospitalConsultation {
  id: string;
  patientName: string;
  doctorName: string;
  kitId: string;
  date: Date;
  paymentAmount: number; // 750 LE
  hospitalPayout: number; // 10% of 750 LE = 75 LE
  platformRevenue: number; // 90% of 750 LE = 675 LE
  status: 'completed' | 'pending';
}

export interface FreelanceTechnician {
  id: string;
  name: string;
  yearlySubscription: number; // 2500 LE
  lastPaymentDate: Date;
  nextPaymentDate: Date;
  subscriptionStatus: 'active' | 'expired' | 'pending';
  assignedKits: string[];
  visits: FreelanceVisit[];
  totalRevenue: number; // Subscription + 15% from visits
}

export interface FreelanceVisit {
  id: string;
  patientName: string;
  doctorName: string;
  kitId: string;
  date: Date;
  paymentAmount: number; // 750 LE
  freelancePayout: number; // 15% of 750 LE = 112.5 LE
  platformRevenue: number; // 85% of 750 LE = 637.5 LE
  status: 'completed' | 'pending';
}

export interface DoctorPayout {
  id: string;
  doctorName: string;
  specialty: string;
  consultations: DoctorConsultation[];
  totalPayout: number;
  totalConsultations: number;
  paymentStatus: 'paid' | 'pending' | 'processing';
}

export interface DoctorConsultation {
  id: string;
  patientName: string;
  date: Date;
  paymentAmount: number; // 750 LE
  doctorPayout: number; // 50% of 750 LE = 375 LE
  platformRevenue: number; // 50% of 750 LE = 375 LE
  consultationType: 'home-visit' | 'video-only';
  kitUsed?: string;
  status: 'completed' | 'pending';
}

export interface TechnicianPayout {
  id: string;
  technicianName: string;
  type: 'employed' | 'freelance';
  visits: TechnicianVisit[];
  totalPayout: number;
  totalVisits: number;
  paymentStatus: 'paid' | 'pending' | 'processing';
}

export interface TechnicianVisit {
  id: string;
  patientName: string;
  doctorName: string;
  kitId: string;
  date: Date;
  paymentAmount: number; // 750 LE
  technicianPayout: number; // 30% for employed (225 LE) or 15% for freelance (112.5 LE)
  platformRevenue: number; // 70% for employed (525 LE) or 85% for freelance (637.5 LE)
  status: 'completed' | 'pending';
}

export interface TimeFilter {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'custom';
  startDate?: Date;
  endDate?: Date;
}

export interface RevenueChartData {
  name: string;
  homeVisits: number;
  hospitalSubscriptions: number;
  freelanceSubscriptions: number;
  total: number;
}

export interface PieChartData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}