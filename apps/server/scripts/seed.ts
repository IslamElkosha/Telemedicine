import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { UserRole, UserStatus, AppointmentStatus, LocationType, PaymentStatus, DeviceType, KitStatus, TechnicianAvailability } from '@telemedicine/shared';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.auditLog.deleteMany();
  await prisma.reading.deleteMany();
  await prisma.session.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.device.deleteMany();
  await prisma.kit.deleteMany();
  await prisma.address.deleteMany();
  await prisma.technicianRoute.deleteMany();
  await prisma.geofence.deleteMany();
  await prisma.hospitalUser.deleteMany();
  await prisma.technician.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.hospital.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('demo123', 12);
  const adminPasswordHash = await bcrypt.hash('admin2025!', 12);

  // Create hospitals
  const hospitals = await Promise.all([
    prisma.hospital.create({
      data: {
        name: 'Cairo General Hospital',
        contactEmail: 'contact@cairogh.com',
        phone: '+20 2 2345 6789',
        address: '123 Medical Street, Downtown',
        city: 'Cairo',
        region: 'Cairo',
        locationPoint: { lat: 30.0444, lng: 31.2357 }
      }
    }),
    prisma.hospital.create({
      data: {
        name: 'Alexandria Medical Center',
        contactEmail: 'info@alexmed.com',
        phone: '+20 3 1234 5678',
        address: '456 Health Avenue, Sidi Gaber',
        city: 'Alexandria',
        region: 'Alexandria',
        locationPoint: { lat: 31.2001, lng: 29.9187 }
      }
    })
  ]);

  // Create users with profiles
  const users = await Promise.all([
    // Admin
    prisma.user.create({
      data: {
        email: 'admin@telemedcare.com',
        passwordHash: adminPasswordHash,
        role: UserRole.ADMIN,
        phone: '+20 100 000 0001',
        profile: {
          create: {
            fullName: 'System Administrator',
            locale: 'en-US',
            timezone: 'Africa/Cairo'
          }
        }
      }
    }),
    
    // Platform Ops
    prisma.user.create({
      data: {
        email: 'ops@telemedcare.com',
        passwordHash: passwordHash,
        role: UserRole.PLATFORM_OPS,
        phone: '+20 100 000 0002',
        profile: {
          create: {
            fullName: 'Platform Operations',
            locale: 'en-US',
            timezone: 'Africa/Cairo'
          }
        }
      }
    }),

    // Hospital Admin
    prisma.user.create({
      data: {
        email: 'hospital.admin@cairogh.com',
        passwordHash: passwordHash,
        role: UserRole.HOSPITAL_ADMIN,
        phone: '+20 100 000 0003',
        profile: {
          create: {
            fullName: 'Hospital Administrator',
            locale: 'ar-EG',
            timezone: 'Africa/Cairo'
          }
        }
      }
    }),

    // Doctors
    prisma.user.create({
      data: {
        email: 'dr.sarah@telemedcare.com',
        passwordHash: passwordHash,
        role: UserRole.DOCTOR,
        phone: '+20 101 234 5678',
        profile: {
          create: {
            fullName: 'Dr. Sarah Johnson',
            gender: 'FEMALE',
            locale: 'en-US',
            timezone: 'Africa/Cairo'
          }
        },
        doctorProfile: {
          create: {
            specialty: 'Cardiology',
            licenseNo: 'MD-2024-001',
            hospitalId: hospitals[0].id
          }
        }
      }
    }),

    prisma.user.create({
      data: {
        email: 'dr.michael@telemedcare.com',
        passwordHash: passwordHash,
        role: UserRole.DOCTOR,
        phone: '+20 101 234 5679',
        profile: {
          create: {
            fullName: 'Dr. Michael Chen',
            gender: 'MALE',
            locale: 'en-US',
            timezone: 'Africa/Cairo'
          }
        },
        doctorProfile: {
          create: {
            specialty: 'Internal Medicine',
            licenseNo: 'MD-2024-002',
            hospitalId: hospitals[0].id
          }
        }
      }
    }),

    prisma.user.create({
      data: {
        email: 'dr.emily@telemedcare.com',
        passwordHash: passwordHash,
        role: UserRole.DOCTOR,
        phone: '+20 101 234 5680',
        profile: {
          create: {
            fullName: 'Dr. Emily Wilson',
            gender: 'FEMALE',
            locale: 'en-US',
            timezone: 'Africa/Cairo'
          }
        },
        doctorProfile: {
          create: {
            specialty: 'Dermatology',
            licenseNo: 'MD-2024-003',
            hospitalId: hospitals[1].id
          }
        }
      }
    }),

    prisma.user.create({
      data: {
        email: 'dr.ahmed@telemedcare.com',
        passwordHash: passwordHash,
        role: UserRole.DOCTOR,
        phone: '+20 101 234 5681',
        profile: {
          create: {
            fullName: 'Dr. Ahmed Hassan',
            gender: 'MALE',
            locale: 'ar-EG',
            timezone: 'Africa/Cairo'
          }
        },
        doctorProfile: {
          create: {
            specialty: 'Pediatrics',
            licenseNo: 'MD-2024-004'
          }
        }
      }
    }),

    prisma.user.create({
      data: {
        email: 'dr.fatima@telemedcare.com',
        passwordHash: passwordHash,
        role: UserRole.DOCTOR,
        phone: '+20 101 234 5682',
        profile: {
          create: {
            fullName: 'Dr. Fatima Al-Zahra',
            gender: 'FEMALE',
            locale: 'ar-EG',
            timezone: 'Africa/Cairo'
          }
        },
        doctorProfile: {
          create: {
            specialty: 'Gynecology',
            licenseNo: 'MD-2024-005'
          }
        }
      }
    }),

    // Technicians
    prisma.user.create({
      data: {
        email: 'tech.mike@telemedcare.com',
        passwordHash: passwordHash,
        role: UserRole.TECHNICIAN,
        phone: '+20 102 345 6789',
        profile: {
          create: {
            fullName: 'Mike Wilson',
            gender: 'MALE',
            nationalId: '29012345678901',
            locale: 'en-US',
            timezone: 'Africa/Cairo'
          }
        }
      }
    }),

    prisma.user.create({
      data: {
        email: 'tech.sarah@telemedcare.com',
        passwordHash: passwordHash,
        role: UserRole.TECHNICIAN,
        phone: '+20 102 345 6790',
        profile: {
          create: {
            fullName: 'Sarah Davis',
            gender: 'FEMALE',
            nationalId: '29012345678902',
            locale: 'en-US',
            timezone: 'Africa/Cairo'
          }
        }
      }
    }),

    prisma.user.create({
      data: {
        email: 'tech.omar@telemedcare.com',
        passwordHash: passwordHash,
        role: UserRole.TECHNICIAN,
        phone: '+20 102 345 6791',
        profile: {
          create: {
            fullName: 'Omar Mahmoud',
            gender: 'MALE',
            nationalId: '29012345678903',
            locale: 'ar-EG',
            timezone: 'Africa/Cairo'
          }
        }
      }
    }),

    prisma.user.create({
      data: {
        email: 'tech.layla@telemedcare.com',
        passwordHash: passwordHash,
        role: UserRole.TECHNICIAN,
        phone: '+20 102 345 6792',
        profile: {
          create: {
            fullName: 'Layla Ahmed',
            gender: 'FEMALE',
            nationalId: '29012345678904',
            locale: 'ar-EG',
            timezone: 'Africa/Cairo'
          }
        }
      }
    }),

    // Freelance Technicians
    prisma.user.create({
      data: {
        email: 'freelance.alex@telemedcare.com',
        passwordHash: passwordHash,
        role: UserRole.FREELANCE_TECHNICIAN,
        phone: '+20 103 456 7890',
        profile: {
          create: {
            fullName: 'Alex Thompson',
            gender: 'MALE',
            nationalId: '29012345678905',
            locale: 'en-US',
            timezone: 'Africa/Cairo'
          }
        }
      }
    }),

    prisma.user.create({
      data: {
        email: 'freelance.nour@telemedcare.com',
        passwordHash: passwordHash,
        role: UserRole.FREELANCE_TECHNICIAN,
        phone: '+20 103 456 7891',
        profile: {
          create: {
            fullName: 'Nour El-Din',
            gender: 'FEMALE',
            nationalId: '29012345678906',
            locale: 'ar-EG',
            timezone: 'Africa/Cairo'
          }
        }
      }
    }),

    // Patients
    ...Array.from({ length: 10 }, (_, i) => 
      prisma.user.create({
        data: {
          email: `patient${i + 1}@example.com`,
          passwordHash: passwordHash,
          role: UserRole.PATIENT,
          phone: `+20 100 123 ${String(4567 + i).padStart(4, '0')}`,
          profile: {
            create: {
              fullName: `Patient ${i + 1}`,
              gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
              dob: new Date(1980 + (i % 40), i % 12, (i % 28) + 1),
              locale: 'ar-EG',
              timezone: 'Africa/Cairo'
            }
          },
          patientProfile: {
            create: {
              mrn: `MRN-${String(1000 + i).padStart(6, '0')}`,
              bloodType: ['A+', 'B+', 'AB+', 'O+', 'A-', 'B-', 'AB-', 'O-'][i % 8],
              heightCm: 160 + (i % 30),
              weightKg: 60 + (i % 40)
            }
          }
        }
      })
    )
  ]);

  // Create hospital users
  await prisma.hospitalUser.create({
    data: {
      hospitalId: hospitals[0].id,
      userId: users[2].id, // Hospital admin
      role: 'HOSPITAL_ADMIN'
    }
  });

  await prisma.hospitalUser.create({
    data: {
      hospitalId: hospitals[0].id,
      userId: users[3].id, // Dr. Sarah
      role: 'DOCTOR'
    }
  });

  await prisma.hospitalUser.create({
    data: {
      hospitalId: hospitals[0].id,
      userId: users[4].id, // Dr. Michael
      role: 'DOCTOR'
    }
  });

  // Create kits
  const kits = await Promise.all([
    prisma.kit.create({
      data: {
        code: 'KIT-001',
        status: KitStatus.ASSIGNED
      }
    }),
    prisma.kit.create({
      data: {
        code: 'KIT-002',
        status: KitStatus.ASSIGNED
      }
    }),
    prisma.kit.create({
      data: {
        code: 'KIT-003',
        status: KitStatus.ASSIGNED
      }
    }),
    prisma.kit.create({
      data: {
        code: 'KIT-004',
        status: KitStatus.ASSIGNED
      }
    }),
    prisma.kit.create({
      data: {
        code: 'KIT-005',
        status: KitStatus.IN_STOCK
      }
    }),
    prisma.kit.create({
      data: {
        code: 'KIT-006',
        status: KitStatus.IN_STOCK
      }
    })
  ]);

  // Create technician profiles and assign kits
  const technicians = await Promise.all([
    prisma.technician.create({
      data: {
        id: users[8].id, // Mike Wilson
        isFreelance: false,
        coverageAreas: ['cairo-city', 'nasr-city', 'helwan'],
        kitId: kits[0].id,
        rating: 4.8,
        availability: TechnicianAvailability.ONLINE,
        currentGeo: { lat: 30.0444, lng: 31.2357 },
        lastSeenAt: new Date()
      }
    }),
    prisma.technician.create({
      data: {
        id: users[9].id, // Sarah Davis
        isFreelance: false,
        coverageAreas: ['alexandria-city', 'montaza'],
        kitId: kits[1].id,
        rating: 4.9,
        availability: TechnicianAvailability.ONLINE,
        currentGeo: { lat: 31.2001, lng: 29.9187 },
        lastSeenAt: new Date()
      }
    }),
    prisma.technician.create({
      data: {
        id: users[10].id, // Omar Mahmoud
        isFreelance: false,
        coverageAreas: ['giza-city', 'dokki'],
        kitId: kits[2].id,
        rating: 4.7,
        availability: TechnicianAvailability.OFFLINE,
        currentGeo: { lat: 30.0131, lng: 31.2089 }
      }
    }),
    prisma.technician.create({
      data: {
        id: users[11].id, // Layla Ahmed
        isFreelance: false,
        coverageAreas: ['mansoura', 'talkha'],
        kitId: kits[3].id,
        rating: 4.6,
        availability: TechnicianAvailability.ONLINE,
        currentGeo: { lat: 31.0409, lng: 31.3785 },
        lastSeenAt: new Date()
      }
    }),
    prisma.technician.create({
      data: {
        id: users[12].id, // Alex Thompson (Freelance)
        isFreelance: true,
        coverageAreas: ['cairo-city', 'maadi', 'zamalek'],
        rating: 4.9,
        availability: TechnicianAvailability.ONLINE,
        currentGeo: { lat: 30.0626, lng: 31.2497 },
        lastSeenAt: new Date()
      }
    }),
    prisma.technician.create({
      data: {
        id: users[13].id, // Nour El-Din (Freelance)
        isFreelance: true,
        coverageAreas: ['alexandria-city', 'agami'],
        rating: 4.8,
        availability: TechnicianAvailability.OFFLINE,
        currentGeo: { lat: 31.1656, lng: 29.8739 }
      }
    })
  ]);

  // Update kits with technician assignments
  await Promise.all([
    prisma.kit.update({
      where: { id: kits[0].id },
      data: { technicianId: technicians[0].id }
    }),
    prisma.kit.update({
      where: { id: kits[1].id },
      data: { technicianId: technicians[1].id }
    }),
    prisma.kit.update({
      where: { id: kits[2].id },
      data: { technicianId: technicians[2].id }
    }),
    prisma.kit.update({
      where: { id: kits[3].id },
      data: { technicianId: technicians[3].id }
    })
  ]);

  // Create devices
  const devices = await Promise.all([
    // Kit 1 devices (Mike Wilson)
    prisma.device.create({
      data: {
        type: DeviceType.BP,
        make: 'MedTech',
        model: 'BP-Pro-2024',
        serial: 'BP-001-2024',
        pairingCode: 'BP001',
        ownerTechnicianId: technicians[0].id,
        assignedKitId: kits[0].id,
        fhirMapping: {
          systolic: { code: '8480-6', system: 'http://loinc.org' },
          diastolic: { code: '8462-4', system: 'http://loinc.org' }
        }
      }
    }),
    prisma.device.create({
      data: {
        type: DeviceType.STETH,
        make: 'AudioMed',
        model: 'Stetho-Digital-X1',
        serial: 'ST-002-2024',
        pairingCode: 'ST002',
        ownerTechnicianId: technicians[0].id,
        assignedKitId: kits[0].id
      }
    }),
    prisma.device.create({
      data: {
        type: DeviceType.SPO2,
        make: 'VitalSigns',
        model: 'OX-Monitor-Pro',
        serial: 'OX-003-2024',
        pairingCode: 'OX003',
        ownerTechnicianId: technicians[0].id,
        assignedKitId: kits[0].id
      }
    }),
    prisma.device.create({
      data: {
        type: DeviceType.THERMO,
        make: 'TempTech',
        model: 'Thermo-Digital-2024',
        serial: 'TH-004-2024',
        pairingCode: 'TH004',
        ownerTechnicianId: technicians[0].id,
        assignedKitId: kits[0].id
      }
    }),
    prisma.device.create({
      data: {
        type: DeviceType.ECG,
        make: 'CardioTech',
        model: 'ECG-12-Lead-Pro',
        serial: 'ECG-005-2024',
        pairingCode: 'ECG005',
        ownerTechnicianId: technicians[0].id,
        assignedKitId: kits[0].id
      }
    }),
    prisma.device.create({
      data: {
        type: DeviceType.ULTRASOUND,
        make: 'UltraSound Systems',
        model: 'PortaScan-Pro',
        serial: 'US-006-2024',
        pairingCode: 'US006',
        ownerTechnicianId: technicians[0].id,
        assignedKitId: kits[0].id
      }
    }),
    prisma.device.create({
      data: {
        type: DeviceType.OTHER,
        make: 'VisionMed',
        model: 'OtoScope-HD-2000',
        serial: 'OT-007-2024',
        pairingCode: 'OT007',
        ownerTechnicianId: technicians[0].id,
        assignedKitId: kits[0].id
      }
    }),

    // Kit 2 devices (Sarah Davis)
    ...Array.from({ length: 7 }, (_, i) => 
      prisma.device.create({
        data: {
          type: [DeviceType.BP, DeviceType.STETH, DeviceType.SPO2, DeviceType.THERMO, DeviceType.ECG, DeviceType.ULTRASOUND, DeviceType.OTHER][i],
          make: 'MedTech',
          model: `Device-${i + 8}`,
          serial: `DEV-${String(i + 8).padStart(3, '0')}-2024`,
          pairingCode: `DEV${String(i + 8).padStart(3, '0')}`,
          ownerTechnicianId: technicians[1].id,
          assignedKitId: kits[1].id
        }
      })
    )
  ]);

  // Create addresses for patients
  const addresses = await Promise.all(
    users.slice(14).map((user, i) => // Patient users
      prisma.address.create({
        data: {
          userId: user.id,
          label: 'Home',
          line1: `${123 + i} Patient Street`,
          city: ['Cairo', 'Alexandria', 'Giza', 'Mansoura', 'Zagazig'][i % 5],
          region: ['Cairo', 'Alexandria', 'Giza', 'Dakahlia', 'Sharqia'][i % 5],
          country: 'EG',
          geo: {
            lat: 30.0444 + (Math.random() - 0.5) * 0.1,
            lng: 31.2357 + (Math.random() - 0.5) * 0.1
          },
          isPrimary: true
        }
      })
    )
  );

  // Create appointments
  const appointments = await Promise.all(
    Array.from({ length: 20 }, (_, i) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + i + 1); // Future appointments
      startDate.setHours(9 + (i % 8), 0, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + 1);

      return prisma.appointment.create({
        data: {
          patientId: users[14 + (i % 10)].id, // Rotate through patients
          doctorId: users[3 + (i % 5)].id, // Rotate through doctors
          technicianId: technicians[i % 4].id, // Rotate through employed technicians
          status: i < 5 ? AppointmentStatus.COMPLETED : AppointmentStatus.BOOKED,
          startAt: startDate,
          endAt: endDate,
          locationType: LocationType.HOME,
          addressId: addresses[i % 10].id,
          notes: `Appointment ${i + 1} - Routine checkup`,
          createdByUserId: users[14 + (i % 10)].id,
          assignedAreaCode: ['cairo-city', 'alexandria-city', 'giza-city', 'mansoura'][i % 4],
          paymentStatus: i < 5 ? PaymentStatus.PAID : PaymentStatus.PENDING
        }
      });
    })
  );

  // Create sessions for completed appointments
  const completedAppointments = appointments.slice(0, 5);
  const sessions = await Promise.all(
    completedAppointments.map(appointment =>
      prisma.session.create({
        data: {
          appointmentId: appointment.id,
          startedAt: appointment.startAt,
          endedAt: appointment.endAt,
          status: 'CLOSED',
          summary: 'Consultation completed successfully'
        }
      })
    )
  );

  // Create readings for sessions
  await Promise.all(
    sessions.flatMap(session =>
      Array.from({ length: 10 }, (_, i) =>
        prisma.reading.create({
          data: {
            sessionId: session.id,
            deviceId: devices[i % 7].id, // Rotate through devices
            type: ['blood-pressure', 'heart-rate', 'temperature', 'spo2', 'ecg'][i % 5],
            payload: {
              value: 120 + (i % 20),
              unit: ['mmHg', 'bpm', '°C', '%', 'mV'][i % 5],
              timestamp: new Date().toISOString()
            },
            capturedAt: new Date(session.startedAt.getTime() + i * 60000) // 1 minute intervals
          }
        })
      )
    )
  );

  // Create geofences
  await Promise.all([
    prisma.geofence.create({
      data: {
        name: 'Cairo Central',
        polygon: {
          type: 'Polygon',
          coordinates: [[
            [31.2, 30.0],
            [31.3, 30.0],
            [31.3, 30.1],
            [31.2, 30.1],
            [31.2, 30.0]
          ]]
        },
        city: 'Cairo',
        region: 'Cairo'
      }
    }),
    prisma.geofence.create({
      data: {
        name: 'Alexandria Coast',
        polygon: {
          type: 'Polygon',
          coordinates: [[
            [29.9, 31.1],
            [30.0, 31.1],
            [30.0, 31.3],
            [29.9, 31.3],
            [29.9, 31.1]
          ]]
        },
        city: 'Alexandria',
        region: 'Alexandria'
      }
    }),
    prisma.geofence.create({
      data: {
        name: 'Giza Pyramids Area',
        polygon: {
          type: 'Polygon',
          coordinates: [[
            [31.1, 29.9],
            [31.2, 29.9],
            [31.2, 30.0],
            [31.1, 30.0],
            [31.1, 29.9]
          ]]
        },
        city: 'Giza',
        region: 'Giza'
      }
    })
  ]);

  // Create sample notifications
  await Promise.all(
    users.slice(14, 17).map(user => // First 3 patients
      prisma.notification.create({
        data: {
          userId: user.id,
          title: 'Appointment Reminder',
          body: 'Your appointment is scheduled for tomorrow at 10:00 AM',
          channel: 'IN_APP',
          status: 'SENT',
          sentAt: new Date()
        }
      })
    )
  );

  console.log('✅ Database seeded successfully!');
  console.log(`Created:`);
  console.log(`- ${users.length} users`);
  console.log(`- ${hospitals.length} hospitals`);
  console.log(`- ${kits.length} kits`);
  console.log(`- ${devices.length} devices`);
  console.log(`- ${appointments.length} appointments`);
  console.log(`- ${sessions.length} sessions`);
  console.log(`- 3 geofences`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });