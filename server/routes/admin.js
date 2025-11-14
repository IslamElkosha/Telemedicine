const express = require('express');
const router = express.Router();

// Middleware to check admin authentication
const requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // In a real app, verify JWT token here
  const token = authHeader.split(' ')[1];
  
  // Mock admin verification - replace with actual JWT verification
  if (token !== 'admin-token') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};

// Mock database - replace with actual database queries
const generateFinancialData = () => {
  const PATIENT_PAYMENT = 750;
  const currentDate = new Date();
  
  // Generate home visit transactions
  const homeVisits = [];
  
  // Employed technician visits (Platform: 30%, Doctor: 50%, Technician: 30%)
  for (let i = 0; i < 45; i++) {
    homeVisits.push({
      id: `hv-emp-${i + 1}`,
      patientName: `Patient ${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26) + 1}`,
      doctorName: 'Dr. Sarah Johnson',
      technicianName: 'Mike Wilson',
      kitId: `KIT-${String(Math.floor(Math.random() * 3) + 1).padStart(3, '0')}`,
      date: new Date(currentDate.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      paymentAmount: PATIENT_PAYMENT,
      status: Math.random() > 0.1 ? 'paid' : 'pending',
      platformRevenue: PATIENT_PAYMENT * 0.3, // 225 LE
      doctorPayout: PATIENT_PAYMENT * 0.5, // 375 LE
      technicianPayout: PATIENT_PAYMENT * 0.3, // 225 LE
      technicianType: 'employed'
    });
  }
  
  // Freelance technician visits (Platform: 85%, Freelance: 15%)
  for (let i = 0; i < 23; i++) {
    homeVisits.push({
      id: `hv-free-${i + 1}`,
      patientName: `Patient ${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26) + 1}`,
      doctorName: 'Dr. Michael Chen',
      technicianName: 'Alex Thompson',
      kitId: 'KIT-007',
      date: new Date(currentDate.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      paymentAmount: PATIENT_PAYMENT,
      status: Math.random() > 0.1 ? 'paid' : 'pending',
      platformRevenue: PATIENT_PAYMENT * 0.85, // 637.5 LE
      doctorPayout: PATIENT_PAYMENT * 0.5, // 375 LE (from platform share)
      technicianPayout: PATIENT_PAYMENT * 0.15, // 112.5 LE
      technicianType: 'freelance'
    });
  }
  
  // Hospital kit consultations (Platform: 90%, Hospital: 10%)
  for (let i = 0; i < 156; i++) {
    homeVisits.push({
      id: `hv-hosp-${i + 1}`,
      patientName: `Patient ${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26) + 1}`,
      doctorName: 'Dr. Emily Wilson',
      technicianName: 'Hospital Staff',
      kitId: `KIT-${String(Math.floor(Math.random() * 2) + 4).padStart(3, '0')}`,
      date: new Date(currentDate.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      paymentAmount: PATIENT_PAYMENT,
      status: Math.random() > 0.1 ? 'paid' : 'pending',
      platformRevenue: PATIENT_PAYMENT * 0.9, // 675 LE
      doctorPayout: PATIENT_PAYMENT * 0.5, // 375 LE (from platform share)
      technicianPayout: 0, // Hospital staff
      technicianType: 'employed',
      hospitalId: 'HOSP-001',
      hospitalName: 'City General Hospital'
    });
  }
  
  // Hospital subscriptions
  const hospitalSubscriptions = [
    {
      id: 'HOSP-001',
      hospitalName: 'City General Hospital',
      subscriptionPlan: 'Premium',
      yearlyFee: 3000,
      lastPaymentDate: new Date(2025, 0, 1),
      nextPaymentDate: new Date(2026, 0, 1),
      status: 'active',
      assignedKits: ['KIT-004', 'KIT-006'],
      totalConsultations: 156,
      consultationRevenue: 156 * PATIENT_PAYMENT * 0.9, // 90% from consultations
      hospitalPayout: 156 * PATIENT_PAYMENT * 0.1 // 10% to hospital
    },
    {
      id: 'HOSP-002',
      hospitalName: 'Metropolitan Medical Center',
      subscriptionPlan: 'Enterprise',
      yearlyFee: 3000,
      lastPaymentDate: new Date(2025, 0, 15),
      nextPaymentDate: new Date(2026, 0, 15),
      status: 'active',
      assignedKits: ['KIT-008', 'KIT-009'],
      totalConsultations: 0,
      consultationRevenue: 0,
      hospitalPayout: 0
    }
  ];
  
  // Freelance technicians
  const freelanceTechnicians = [
    {
      id: 'TECH-FREE-001',
      name: 'Alex Thompson',
      yearlySubscription: 2500,
      lastPaymentDate: new Date(2025, 0, 1),
      nextPaymentDate: new Date(2026, 0, 1),
      subscriptionStatus: 'active',
      assignedKits: ['KIT-007'],
      totalVisits: 23,
      visitRevenue: 23 * PATIENT_PAYMENT * 0.85, // 85% from visits
      freelancePayout: 23 * PATIENT_PAYMENT * 0.15 // 15% to freelance
    }
  ];
  
  return {
    homeVisits,
    hospitalSubscriptions,
    freelanceTechnicians
  };
};

// GET /api/admin/financials/overview
router.get('/financials/overview', requireAdmin, (req, res) => {
  try {
    const { homeVisits, hospitalSubscriptions, freelanceTechnicians } = generateFinancialData();
    
    // Calculate totals
    const totalPatientPayments = homeVisits
      .filter(hv => hv.status === 'paid')
      .reduce((sum, hv) => sum + hv.paymentAmount, 0);
    
    const homeVisitRevenue = homeVisits
      .filter(hv => hv.status === 'paid')
      .reduce((sum, hv) => sum + hv.platformRevenue, 0);
    
    const hospitalSubscriptionRevenue = hospitalSubscriptions
      .filter(hs => hs.status === 'active')
      .reduce((sum, hs) => sum + hs.yearlyFee + hs.consultationRevenue, 0);
    
    const freelanceSubscriptionRevenue = freelanceTechnicians
      .filter(ft => ft.subscriptionStatus === 'active')
      .reduce((sum, ft) => sum + ft.yearlySubscription + ft.visitRevenue, 0);
    
    const totalRevenue = homeVisitRevenue + hospitalSubscriptionRevenue + freelanceSubscriptionRevenue;
    
    const totalConsultations = homeVisits.filter(hv => hv.status === 'paid').length;
    
    const totalDoctorPayouts = homeVisits
      .filter(hv => hv.status === 'paid')
      .reduce((sum, hv) => sum + hv.doctorPayout, 0);
    
    const totalTechnicianPayouts = homeVisits
      .filter(hv => hv.status === 'paid' && hv.technicianType === 'employed')
      .reduce((sum, hv) => sum + hv.technicianPayout, 0);
    
    const totalFreelancePayouts = homeVisits
      .filter(hv => hv.status === 'paid' && hv.technicianType === 'freelance')
      .reduce((sum, hv) => sum + hv.technicianPayout, 0);
    
    const totalHospitalPayouts = hospitalSubscriptions
      .reduce((sum, hs) => sum + hs.hospitalPayout, 0);
    
    const overview = {
      totalRevenue,
      totalPatientPayments,
      totalPayouts: totalDoctorPayouts + totalTechnicianPayouts + totalFreelancePayouts + totalHospitalPayouts,
      revenueStreams: {
        homeVisits: homeVisitRevenue,
        hospitalSubscriptions: hospitalSubscriptionRevenue,
        freelanceSubscriptions: freelanceSubscriptionRevenue
      },
      metrics: {
        totalConsultations,
        averageRevenuePerConsultation: totalConsultations > 0 ? totalRevenue / totalConsultations : 0,
        totalDoctorPayouts,
        totalTechnicianPayouts,
        totalFreelancePayouts,
        totalHospitalPayouts
      }
    };
    
    res.json(overview);
  } catch (error) {
    console.error('Error fetching financial overview:', error);
    res.status(500).json({ error: 'Failed to fetch financial overview' });
  }
});

// GET /api/admin/financials/transactions
router.get('/financials/transactions', requireAdmin, (req, res) => {
  try {
    const { source, startDate, endDate, status } = req.query;
    const { homeVisits, hospitalSubscriptions, freelanceTechnicians } = generateFinancialData();
    
    let transactions = [];
    
    if (!source || source === 'home_visits') {
      let filteredHomeVisits = homeVisits;
      
      // Apply date filter
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        filteredHomeVisits = filteredHomeVisits.filter(hv => 
          hv.date >= start && hv.date <= end
        );
      }
      
      // Apply status filter
      if (status) {
        filteredHomeVisits = filteredHomeVisits.filter(hv => hv.status === status);
      }
      
      transactions = [...transactions, ...filteredHomeVisits];
    }
    
    if (!source || source === 'hospitals') {
      transactions = [...transactions, ...hospitalSubscriptions];
    }
    
    if (!source || source === 'tech_services') {
      transactions = [...transactions, ...freelanceTechnicians];
    }
    
    res.json({
      transactions,
      total: transactions.length,
      source: source || 'all'
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// GET /api/admin/financials/payouts/doctors
router.get('/financials/payouts/doctors', requireAdmin, (req, res) => {
  try {
    const { doctorId, startDate, endDate, paymentStatus } = req.query;
    const { homeVisits } = generateFinancialData();
    
    // Group by doctor
    const doctorPayouts = {};
    
    homeVisits
      .filter(hv => hv.status === 'paid')
      .forEach(hv => {
        if (!doctorPayouts[hv.doctorName]) {
          doctorPayouts[hv.doctorName] = {
            doctorName: hv.doctorName,
            specialty: 'Cardiology', // Would come from doctor profile
            consultations: [],
            totalPayout: 0,
            totalConsultations: 0,
            paymentStatus: Math.random() > 0.3 ? 'paid' : 'pending'
          };
        }
        
        doctorPayouts[hv.doctorName].consultations.push({
          id: hv.id,
          patientName: hv.patientName,
          date: hv.date,
          paymentAmount: hv.paymentAmount,
          doctorPayout: hv.doctorPayout,
          platformRevenue: hv.platformRevenue,
          consultationType: 'home-visit',
          kitUsed: hv.kitId,
          status: 'completed'
        });
        
        doctorPayouts[hv.doctorName].totalPayout += hv.doctorPayout;
        doctorPayouts[hv.doctorName].totalConsultations += 1;
      });
    
    let result = Object.values(doctorPayouts);
    
    // Apply filters
    if (doctorId) {
      result = result.filter(doctor => doctor.doctorName.includes(doctorId));
    }
    
    if (paymentStatus) {
      result = result.filter(doctor => doctor.paymentStatus === paymentStatus);
    }
    
    res.json({
      doctors: result,
      total: result.length
    });
  } catch (error) {
    console.error('Error fetching doctor payouts:', error);
    res.status(500).json({ error: 'Failed to fetch doctor payouts' });
  }
});

// GET /api/admin/financials/payouts/technicians
router.get('/financials/payouts/technicians', requireAdmin, (req, res) => {
  try {
    const { technicianId, startDate, endDate, paymentStatus, type } = req.query;
    const { homeVisits } = generateFinancialData();
    
    // Group by technician
    const technicianPayouts = {};
    
    homeVisits
      .filter(hv => hv.status === 'paid' && hv.technicianName !== 'Hospital Staff')
      .forEach(hv => {
        if (!technicianPayouts[hv.technicianName]) {
          technicianPayouts[hv.technicianName] = {
            technicianName: hv.technicianName,
            type: hv.technicianType,
            visits: [],
            totalPayout: 0,
            totalVisits: 0,
            paymentStatus: Math.random() > 0.3 ? 'paid' : 'pending'
          };
        }
        
        technicianPayouts[hv.technicianName].visits.push({
          id: hv.id,
          patientName: hv.patientName,
          doctorName: hv.doctorName,
          kitId: hv.kitId,
          date: hv.date,
          paymentAmount: hv.paymentAmount,
          technicianPayout: hv.technicianPayout,
          platformRevenue: hv.platformRevenue,
          status: 'completed'
        });
        
        technicianPayouts[hv.technicianName].totalPayout += hv.technicianPayout;
        technicianPayouts[hv.technicianName].totalVisits += 1;
      });
    
    let result = Object.values(technicianPayouts);
    
    // Apply filters
    if (technicianId) {
      result = result.filter(tech => tech.technicianName.includes(technicianId));
    }
    
    if (type) {
      result = result.filter(tech => tech.type === type);
    }
    
    if (paymentStatus) {
      result = result.filter(tech => tech.paymentStatus === paymentStatus);
    }
    
    res.json({
      technicians: result,
      total: result.length
    });
  } catch (error) {
    console.error('Error fetching technician payouts:', error);
    res.status(500).json({ error: 'Failed to fetch technician payouts' });
  }
});

// GET /api/admin/financials/payouts/hospitals
router.get('/financials/payouts/hospitals', requireAdmin, (req, res) => {
  try {
    const { hospitalId, startDate, endDate, paymentStatus } = req.query;
    const { hospitalSubscriptions } = generateFinancialData();
    
    let result = hospitalSubscriptions.map(hospital => ({
      id: hospital.id,
      hospitalName: hospital.hospitalName,
      subscriptionPlan: hospital.subscriptionPlan,
      yearlyFee: hospital.yearlyFee,
      lastPaymentDate: hospital.lastPaymentDate,
      nextPaymentDate: hospital.nextPaymentDate,
      status: hospital.status,
      assignedKits: hospital.assignedKits,
      totalConsultations: hospital.totalConsultations,
      consultationRevenue: hospital.consultationRevenue,
      hospitalPayout: hospital.hospitalPayout,
      totalRevenue: hospital.yearlyFee + hospital.consultationRevenue
    }));
    
    // Apply filters
    if (hospitalId) {
      result = result.filter(hospital => hospital.hospitalName.includes(hospitalId));
    }
    
    if (paymentStatus) {
      result = result.filter(hospital => hospital.status === paymentStatus);
    }
    
    res.json({
      hospitals: result,
      total: result.length
    });
  } catch (error) {
    console.error('Error fetching hospital payouts:', error);
    res.status(500).json({ error: 'Failed to fetch hospital payouts' });
  }
});

// GET /api/admin/financials/payouts/freelance
router.get('/financials/payouts/freelance', requireAdmin, (req, res) => {
  try {
    const { technicianId, startDate, endDate, paymentStatus } = req.query;
    const { freelanceTechnicians } = generateFinancialData();
    
    let result = freelanceTechnicians.map(freelance => ({
      id: freelance.id,
      name: freelance.name,
      yearlySubscription: freelance.yearlySubscription,
      lastPaymentDate: freelance.lastPaymentDate,
      nextPaymentDate: freelance.nextPaymentDate,
      subscriptionStatus: freelance.subscriptionStatus,
      assignedKits: freelance.assignedKits,
      totalVisits: freelance.totalVisits,
      visitRevenue: freelance.visitRevenue,
      freelancePayout: freelance.freelancePayout,
      totalRevenue: freelance.yearlySubscription + freelance.visitRevenue
    }));
    
    // Apply filters
    if (technicianId) {
      result = result.filter(freelance => freelance.name.includes(technicianId));
    }
    
    if (paymentStatus) {
      result = result.filter(freelance => freelance.subscriptionStatus === paymentStatus);
    }
    
    res.json({
      freelanceTechnicians: result,
      total: result.length
    });
  } catch (error) {
    console.error('Error fetching freelance payouts:', error);
    res.status(500).json({ error: 'Failed to fetch freelance payouts' });
  }
});

// POST /api/admin/financials/export
router.post('/financials/export', requireAdmin, (req, res) => {
  try {
    const { reportType, format, filters } = req.body;
    const { homeVisits, hospitalSubscriptions, freelanceTechnicians } = generateFinancialData();
    
    let csvContent = '';
    const timestamp = new Date().toISOString().split('T')[0];
    
    switch (reportType) {
      case 'overview':
        csvContent = generateOverviewCSV(homeVisits, hospitalSubscriptions, freelanceTechnicians);
        break;
      case 'home_visits':
        csvContent = generateHomeVisitsCSV(homeVisits, filters);
        break;
      case 'hospitals':
        csvContent = generateHospitalsCSV(hospitalSubscriptions, filters);
        break;
      case 'freelance':
        csvContent = generateFreelanceCSV(freelanceTechnicians, filters);
        break;
      case 'doctor_payouts':
        csvContent = generateDoctorPayoutsCSV(homeVisits, filters);
        break;
      case 'technician_payouts':
        csvContent = generateTechnicianPayoutsCSV(homeVisits, filters);
        break;
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="telemedcare-${reportType}-${timestamp}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting financial report:', error);
    res.status(500).json({ error: 'Failed to export financial report' });
  }
});

// Helper functions for CSV generation
const generateOverviewCSV = (homeVisits, hospitalSubscriptions, freelanceTechnicians) => {
  const totalPatientPayments = homeVisits.filter(hv => hv.status === 'paid').reduce((sum, hv) => sum + hv.paymentAmount, 0);
  const homeVisitRevenue = homeVisits.filter(hv => hv.status === 'paid').reduce((sum, hv) => sum + hv.platformRevenue, 0);
  const hospitalRevenue = hospitalSubscriptions.filter(hs => hs.status === 'active').reduce((sum, hs) => sum + hs.yearlyFee + hs.consultationRevenue, 0);
  const freelanceRevenue = freelanceTechnicians.filter(ft => ft.subscriptionStatus === 'active').reduce((sum, ft) => sum + ft.yearlySubscription + ft.visitRevenue, 0);
  
  return `TeleMedCare Financial Overview Report
Generated: ${new Date().toLocaleDateString()}

PLATFORM OVERVIEW
Total Revenue,${homeVisitRevenue + hospitalRevenue + freelanceRevenue} LE
Total Patient Payments,${totalPatientPayments} LE
Total Consultations,${homeVisits.filter(hv => hv.status === 'paid').length}

REVENUE STREAMS
Home Visits (30%),${homeVisitRevenue} LE
Hospital Subscriptions,${hospitalRevenue} LE
Freelance Subscriptions,${freelanceRevenue} LE

COMMISSION STRUCTURE
Doctor Commission,50% (375 LE per consultation)
Employed Technician Commission,30% (225 LE per consultation)
Freelance Technician Commission,15% (112.5 LE per consultation)
Hospital Commission,10% (75 LE per consultation)
Platform Revenue,Remaining percentage after commissions
`;
};

const generateHomeVisitsCSV = (homeVisits, filters) => {
  let filteredVisits = homeVisits;
  
  if (filters?.startDate && filters?.endDate) {
    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    filteredVisits = filteredVisits.filter(hv => hv.date >= start && hv.date <= end);
  }
  
  if (filters?.status) {
    filteredVisits = filteredVisits.filter(hv => hv.status === filters.status);
  }
  
  let csv = `Home Visit Transactions Report
Generated: ${new Date().toLocaleDateString()}

Patient Name,Doctor Name,Technician Name,Kit Used,Date,Payment Amount,Platform Revenue,Doctor Payout,Technician Payout,Technician Type,Status
`;
  
  filteredVisits.forEach(hv => {
    csv += `${hv.patientName},${hv.doctorName},${hv.technicianName},${hv.kitId},${hv.date.toLocaleDateString()},${hv.paymentAmount},${hv.platformRevenue},${hv.doctorPayout},${hv.technicianPayout},${hv.technicianType},${hv.status}\n`;
  });
  
  return csv;
};

const generateHospitalsCSV = (hospitalSubscriptions, filters) => {
  let csv = `Hospital Subscriptions Report
Generated: ${new Date().toLocaleDateString()}

Hospital Name,Subscription Plan,Yearly Fee,Last Payment,Next Payment,Total Consultations,Consultation Revenue,Hospital Payout,Status
`;
  
  hospitalSubscriptions.forEach(hs => {
    csv += `${hs.hospitalName},${hs.subscriptionPlan},${hs.yearlyFee},${hs.lastPaymentDate.toLocaleDateString()},${hs.nextPaymentDate.toLocaleDateString()},${hs.totalConsultations},${hs.consultationRevenue},${hs.hospitalPayout},${hs.status}\n`;
  });
  
  return csv;
};

const generateFreelanceCSV = (freelanceTechnicians, filters) => {
  let csv = `Freelance Technician Report
Generated: ${new Date().toLocaleDateString()}

Technician Name,Yearly Subscription,Last Payment,Next Payment,Total Visits,Visit Revenue,Freelance Payout,Total Revenue,Status
`;
  
  freelanceTechnicians.forEach(ft => {
    csv += `${ft.name},${ft.yearlySubscription},${ft.lastPaymentDate.toLocaleDateString()},${ft.nextPaymentDate.toLocaleDateString()},${ft.totalVisits},${ft.visitRevenue},${ft.freelancePayout},${ft.yearlySubscription + ft.visitRevenue},${ft.subscriptionStatus}\n`;
  });
  
  return csv;
};

const generateDoctorPayoutsCSV = (homeVisits, filters) => {
  const doctorPayouts = {};
  
  homeVisits
    .filter(hv => hv.status === 'paid')
    .forEach(hv => {
      if (!doctorPayouts[hv.doctorName]) {
        doctorPayouts[hv.doctorName] = {
          doctorName: hv.doctorName,
          totalPayout: 0,
          totalConsultations: 0,
          consultations: []
        };
      }
      
      doctorPayouts[hv.doctorName].totalPayout += hv.doctorPayout;
      doctorPayouts[hv.doctorName].totalConsultations += 1;
      doctorPayouts[hv.doctorName].consultations.push(hv);
    });
  
  let csv = `Doctor Payout Report
Generated: ${new Date().toLocaleDateString()}

Doctor Name,Total Consultations,Total Payout (50%),Average per Consultation
`;
  
  Object.values(doctorPayouts).forEach(doctor => {
    csv += `${doctor.doctorName},${doctor.totalConsultations},${doctor.totalPayout},${doctor.totalPayout / doctor.totalConsultations}\n`;
  });
  
  return csv;
};

const generateTechnicianPayoutsCSV = (homeVisits, filters) => {
  const technicianPayouts = {};
  
  homeVisits
    .filter(hv => hv.status === 'paid' && hv.technicianName !== 'Hospital Staff')
    .forEach(hv => {
      if (!technicianPayouts[hv.technicianName]) {
        technicianPayouts[hv.technicianName] = {
          technicianName: hv.technicianName,
          type: hv.technicianType,
          totalPayout: 0,
          totalVisits: 0
        };
      }
      
      technicianPayouts[hv.technicianName].totalPayout += hv.technicianPayout;
      technicianPayouts[hv.technicianName].totalVisits += 1;
    });
  
  let csv = `Technician Payout Report
Generated: ${new Date().toLocaleDateString()}

Technician Name,Type,Total Visits,Commission Rate,Total Payout,Average per Visit
`;
  
  Object.values(technicianPayouts).forEach(tech => {
    const rate = tech.type === 'employed' ? '30%' : '15%';
    csv += `${tech.technicianName},${tech.type},${tech.totalVisits},${rate},${tech.totalPayout},${tech.totalPayout / tech.totalVisits}\n`;
  });
  
  return csv;
};

module.exports = router;