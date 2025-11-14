import { FastifyInstance } from 'fastify';
import { UpdateTechnicianDto, UserRole } from '@telemedicine/shared';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { AppError } from '../utils/errors.js';
import { auditLog } from '../services/audit.js';

export async function technicianRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify;

  // Get technician profile
  fastify.get('/me', {
    preHandler: [requireRole([UserRole.TECHNICIAN, UserRole.FREELANCE_TECHNICIAN])],
    schema: {
      tags: ['Technicians'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const user = request.user!;

    const technician = await prisma.technician.findUnique({
      where: { id: user.id },
      include: {
        user: {
          include: {
            profile: true
          }
        },
        kit: {
          include: {
            devices: true
          }
        }
      }
    });

    if (!technician) {
      throw new AppError('NOT_FOUND', 'Technician profile not found', 404);
    }

    reply.send({
      success: true,
      data: technician
    });
  });

  // Update technician profile
  fastify.patch('/me', {
    preHandler: [requireRole([UserRole.TECHNICIAN, UserRole.FREELANCE_TECHNICIAN])],
    schema: {
      tags: ['Technicians'],
      security: [{ bearerAuth: [] }],
      body: UpdateTechnicianDto
    }
  }, async (request, reply) => {
    const user = request.user!;
    const updates = request.body;

    const technician = await prisma.technician.update({
      where: { id: user.id },
      data: {
        ...updates,
        ...(updates.currentGeo && { lastSeenAt: new Date() })
      },
      include: {
        user: {
          include: {
            profile: true
          }
        },
        kit: {
          include: {
            devices: true
          }
        }
      }
    });

    // Log update
    await auditLog(prisma, {
      userId: user.id,
      entityType: 'Technician',
      entityId: user.id,
      action: 'UPDATE',
      diff: updates,
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

    reply.send({
      success: true,
      data: technician
    });
  });

  // Update technician location
  fastify.patch('/me/geo', {
    preHandler: [requireRole([UserRole.TECHNICIAN, UserRole.FREELANCE_TECHNICIAN])],
    schema: {
      tags: ['Technicians'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['lat', 'lng'],
        properties: {
          lat: { type: 'number' },
          lng: { type: 'number' }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { lat, lng } = request.body as { lat: number; lng: number };

    const technician = await prisma.technician.update({
      where: { id: user.id },
      data: {
        currentGeo: { lat, lng },
        lastSeenAt: new Date()
      }
    });

    // Emit location update via Socket.IO
    const io = (fastify as any).io;
    if (io) {
      io.emit('technician:location-updated', {
        technicianId: user.id,
        location: { lat, lng }
      });
    }

    reply.send({
      success: true,
      data: { location: { lat, lng } }
    });
  });

  // Get technician earnings
  fastify.get('/me/earnings', {
    preHandler: [requireRole([UserRole.TECHNICIAN, UserRole.FREELANCE_TECHNICIAN])],
    schema: {
      tags: ['Technicians'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'yearly'] },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { period = 'monthly', startDate, endDate } = request.query as any;

    // Calculate date range
    let start: Date, end: Date;
    const now = new Date();

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      switch (period) {
        case 'daily':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
          break;
        case 'weekly':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          end = now;
          break;
        case 'yearly':
          start = new Date(now.getFullYear(), 0, 1);
          end = new Date(now.getFullYear() + 1, 0, 1);
          break;
        default: // monthly
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      }
    }

    // Get completed appointments in date range
    const appointments = await prisma.appointment.findMany({
      where: {
        technicianId: user.id,
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        startAt: {
          gte: start,
          lt: end
        }
      },
      include: {
        patient: {
          include: {
            profile: true
          }
        },
        doctor: {
          include: {
            profile: true
          }
        }
      }
    });

    // Calculate earnings (30% commission for employed, 15% for freelance)
    const technician = await prisma.technician.findUnique({
      where: { id: user.id }
    });

    const commissionRate = technician?.isFreelance ? 0.15 : 0.30;
    const baseAmount = 75000; // 750 EGP in piasters

    const totalEarnings = appointments.length * baseAmount * commissionRate;
    const totalRevenue = appointments.length * baseAmount;

    const earnings = {
      technicianId: user.id,
      period: { startDate: start, endDate: end, type: period },
      totalVisits: appointments.length,
      completedVisits: appointments.length,
      totalRevenue: totalRevenue / 100, // Convert to EGP
      technicianEarnings: totalEarnings / 100, // Convert to EGP
      averagePerVisit: commissionRate * 750, // 750 EGP base amount
      commissionRate,
      transactions: appointments.map(apt => ({
        id: `trans-${apt.id}`,
        appointmentId: apt.id,
        patientName: apt.patient.profile?.fullName || 'Unknown',
        doctorName: apt.doctor.profile?.fullName || 'Unknown',
        date: apt.startAt,
        patientPayment: 750,
        technicianCommission: commissionRate * 750,
        platformFee: (1 - commissionRate) * 750,
        status: 'paid'
      }))
    };

    reply.send({
      success: true,
      data: earnings
    });
  });

  // Get available technicians for assignment
  fastify.get('/available', {
    preHandler: [requireRole([UserRole.ADMIN, UserRole.PLATFORM_OPS, UserRole.HOSPITAL_ADMIN])],
    schema: {
      tags: ['Technicians'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          areaCode: { type: 'string' },
          lat: { type: 'number' },
          lng: { type: 'number' },
          radius: { type: 'number' }
        }
      }
    }
  }, async (request, reply) => {
    const { areaCode, lat, lng, radius = 10 } = request.query as any;

    const technicians = await prisma.technician.findMany({
      where: {
        availability: 'ONLINE',
        ...(areaCode && {
          coverageAreas: {
            path: '$',
            array_contains: [areaCode]
          }
        })
      },
      include: {
        user: {
          include: {
            profile: true
          }
        },
        kit: true
      }
    });

    // If lat/lng provided, filter by distance
    let availableTechnicians = technicians;
    if (lat && lng) {
      availableTechnicians = technicians.filter(tech => {
        if (!tech.currentGeo) return false;
        const techGeo = tech.currentGeo as { lat: number; lng: number };
        const distance = calculateDistance(lat, lng, techGeo.lat, techGeo.lng);
        return distance <= radius;
      });
    }

    reply.send({
      success: true,
      data: availableTechnicians
    });
  });
}

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in kilometers
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}