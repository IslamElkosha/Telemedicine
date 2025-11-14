const express = require('express');
const router = express.Router();

// Mock database for technicians
let technicians = [
  {
    id: 'tech-001',
    name: 'Mike Wilson',
    email: 'mike.wilson@telemedcare.com',
    username: 'mike_wilson',
    password: 'tech123', // Simple password for demo
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

let technicianKits = [
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

let technicianAppointments = [
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
    technicianId: 'tech-001'
  }
];

// POST /api/technician/register
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      username,
      password,
      phone,
      nationalId,
      licenseNumber,
      employmentType,
      serviceArea,
      emergencyContact
    } = req.body;

    // Validate required fields
    if (!name || !email || !username || !password || !nationalId || !licenseNumber) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Check for existing technician
    const existingTechnician = technicians.find(t => 
      t.email === email || 
      t.username === username || 
      t.nationalId === nationalId ||
      t.licenseNumber === licenseNumber
    );

    if (existingTechnician) {
      if (existingTechnician.email === email) {
        return res.status(400).json({ error: 'Email address is already registered' });
      }
      if (existingTechnician.username === username) {
        return res.status(400).json({ error: 'Username is already taken' });
      }
      if (existingTechnician.nationalId === nationalId) {
        return res.status(400).json({ error: 'National ID is already registered' });
      }
      if (existingTechnician.licenseNumber === licenseNumber) {
        return res.status(400).json({ error: 'License number is already registered' });
      }
    }

    // Create new technician
    const newTechnician = {
      id: `tech-${Date.now()}`,
      name,
      email,
      username,
      password,
      phone,
      nationalId,
      licenseNumber,
      employmentType,
      serviceArea,
      assignedKits: [],
      status: 'active',
      rating: 0,
      totalVisits: 0,
      joinDate: new Date(),
      lastLogin: new Date(),
      isVerified: false,
      emergencyContact
    };

    technicians.push(newTechnician);

    // Remove password from response
    const technicianResponse = Object.assign({}, newTechnician);
    delete technicianResponse.password;

    res.status(201).json({
      success: true,
      technician: technicianResponse
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/technician/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find technician by username or email
    const technician = technicians.find(t => 
      t.username === username || t.email === username
    );

    if (!technician) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Simple password check for demo
    const isValidPassword = password === technician.password;

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Update last login
    technician.lastLogin = new Date();

    // Remove password from response
    const technicianResponse = Object.assign({}, technician);
    delete technicianResponse.password;

    res.json({
      success: true,
      technician: technicianResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/technician/profile
router.get('/profile', (req, res) => {
  try {
    const { technicianId } = req.query;
    const technician = technicians.find(t => t.id === technicianId);
    
    if (!technician) {
      return res.status(404).json({ error: 'Technician not found' });
    }

    const technicianResponse = Object.assign({}, technician);
    delete technicianResponse.password;
    res.json(technicianResponse);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/technician/profile
router.put('/profile', (req, res) => {
  try {
    const { technicianId } = req.body;
    const technicianIndex = technicians.findIndex(t => t.id === technicianId);
    
    if (technicianIndex === -1) {
      return res.status(404).json({ error: 'Technician not found' });
    }

    // Update technician profile
    technicians[technicianIndex] = {
      ...technicians[technicianIndex],
      ...req.body,
      id: technicianId // Ensure ID cannot be changed
    };

    const technicianResponse = Object.assign({}, technicians[technicianIndex]);
    delete technicianResponse.password;
    res.json(technicianResponse);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/technician/kits
router.get('/kits', (req, res) => {
  try {
    const { technicianId } = req.query;
    const technician = technicians.find(t => t.id === technicianId);
    
    if (!technician) {
      return res.status(404).json({ error: 'Technician not found' });
    }

    const assignedKits = technicianKits.filter(kit => 
      technician.assignedKits.includes(kit.id)
    );

    res.json(assignedKits);
  } catch (error) {
    console.error('Kits fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch kits' });
  }
});

// PUT /api/technician/kits/:kitId/status
router.put('/kits/:kitId/status', (req, res) => {
  try {
    const { kitId } = req.params;
    const { status, technicianId } = req.body;

    const kitIndex = technicianKits.findIndex(kit => kit.id === kitId);
    
    if (kitIndex === -1) {
      return res.status(404).json({ error: 'Kit not found' });
    }

    // Verify kit belongs to technician
    const technician = technicians.find(t => t.id === technicianId);
    if (!technician || !technician.assignedKits.includes(kitId)) {
      return res.status(403).json({ error: 'Kit not assigned to this technician' });
    }

    technicianKits[kitIndex].status = status;

    // If marking as out-of-service, reassign pending appointments
    if (status === 'out-of-service') {
      reassignAppointments(technicianId);
    }

    res.json(technicianKits[kitIndex]);
  } catch (error) {
    console.error('Kit status update error:', error);
    res.status(500).json({ error: 'Failed to update kit status' });
  }
});

// GET /api/technician/appointments
router.get('/appointments', (req, res) => {
  try {
    const { technicianId } = req.query;
    const appointments = technicianAppointments.filter(apt => 
      apt.technicianId === technicianId
    );

    res.json(appointments);
  } catch (error) {
    console.error('Appointments fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// PUT /api/technician/appointments/:appointmentId/status
router.put('/appointments/:appointmentId/status', (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status, technicianId } = req.body;

    const appointmentIndex = technicianAppointments.findIndex(apt => 
      apt.id === appointmentId && apt.technicianId === technicianId
    );
    
    if (appointmentIndex === -1) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    technicianAppointments[appointmentIndex].status = status;
    
    if (status === 'in-progress') {
      technicianAppointments[appointmentIndex].actualStartTime = new Date();
    } else if (status === 'completed') {
      technicianAppointments[appointmentIndex].actualEndTime = new Date();
    }

    res.json(technicianAppointments[appointmentIndex]);
  } catch (error) {
    console.error('Appointment status update error:', error);
    res.status(500).json({ error: 'Failed to update appointment status' });
  }
});

// GET /api/technician/earnings
router.get('/earnings', (req, res) => {
  try {
    const { period = 'monthly', technicianId } = req.query;
    
    const completedAppointments = technicianAppointments.filter(apt => 
      apt.technicianId === technicianId && 
      apt.status === 'completed' && 
      apt.paymentStatus === 'paid'
    );

    const totalEarnings = completedAppointments.reduce((sum, apt) => sum + apt.technicianEarnings, 0);
    const totalRevenue = completedAppointments.length * 750; // 750 LE per visit

    const earnings = {
      technicianId: technicianId,
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
        status: 'paid',
        paymentDate: new Date()
      }))
    };

    res.json(earnings);
  } catch (error) {
    console.error('Earnings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch earnings' });
  }
});

// Helper function to reassign appointments
const reassignAppointments = (technicianId) => {
  const pendingAppointments = technicianAppointments.filter(apt => 
    apt.technicianId === technicianId && apt.status === 'assigned'
  );
  
  // In a real app, this would find available technicians in the same area
  // and reassign appointments based on availability and proximity
  console.log(`Reassigning ${pendingAppointments.length} appointments from technician ${technicianId}`);
  
  // For demo, just mark them as reassigned
  pendingAppointments.forEach(apt => {
    apt.status = 'cancelled';
    apt.notes = 'Reassigned due to technician unavailability';
  });
};

// POST /api/technician/device-test
router.post('/device-test', (req, res) => {
  try {
    const { kitId, deviceId } = req.body;
    
    // Simulate device test
    const success = Math.random() > 0.1; // 90% success rate
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Device test completed successfully',
        testResults: {
          connectivity: 'good',
          battery: Math.floor(Math.random() * 30) + 70,
          signalStrength: Math.floor(Math.random() * 40) + 60
        }
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: 'Device test failed. Please check connections and try again.' 
      });
    }
  } catch (error) {
    console.error('Device test error:', error);
    res.status(500).json({ error: 'Device test failed' });
  }
});

// GET /api/technician/notifications
router.get('/notifications', (req, res) => {
  try {
    const { technicianId } = req.query;
    // Mock notifications for the technician
    const notifications = [
      {
        id: 'notif-001',
        technicianId: technicianId,
        type: 'new-assignment',
        title: 'New Appointment Assigned',
        message: 'You have been assigned a new appointment with John Smith for tomorrow at 2:00 PM',
        isRead: false,
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
        actionUrl: '/technician/appointments'
      },
      {
        id: 'notif-002',
        technicianId: technicianId,
        type: 'kit-maintenance',
        title: 'Kit Maintenance Due',
        message: 'Your kit KIT-001 is due for maintenance next week',
        isRead: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    ];

    res.json(notifications);
  } catch (error) {
    console.error('Notifications fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

module.exports = router;