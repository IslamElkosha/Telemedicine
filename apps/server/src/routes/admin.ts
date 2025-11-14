import { FastifyInstance } from 'fastify';
import { UserRole } from '@telemedicine/shared';
import { requireRole } from '../middleware/auth.js';

export async function adminRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify;

  // Get admin statistics
  fastify.get('/stats', {
    preHandler: [requireRole([UserRole.ADMIN, UserRole.PLATFORM_OPS])],
    schema: {
      tags: ['Admin'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const [
      totalUsers,
      totalAppointments,
      totalSessions,
      totalPayments,
      activeDevices,
      onlineTechnicians
    ] = await Promise.all([
      prisma.user.count(),
      prisma.appointment.count(),
      prisma.session.count(),
      prisma.payment.count({ where: { status: 'PAID' } }),
      prisma.device.count({ where: { status: 'ACTIVE' } }),
      prisma.technician.count({ where: { availability: 'ONLINE' } })
    ]);

    // Calculate revenue
    const paidPayments = await prisma.payment.findMany({
      where: { status: 'PAID' },
      select: { amountEgp: true, createdAt: true }
    });

    const totalRevenue = paidPayments.reduce((sum, payment) => sum + payment.amountEgp, 0) / 100; // Convert to EGP

    // Calculate DAU/WAU/MAU (simplified)
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [dau, wau, mau] = await Promise.all([
      prisma.technician.count({
        where: { lastSeenAt: { gte: dayAgo } }
      }),
      prisma.technician.count({
        where: { lastSeenAt: { gte: weekAgo } }
      }),
      prisma.technician.count({
        where: { lastSeenAt: { gte: monthAgo } }
      })
    ]);

    reply.send({
      success: true,
      data: {
        users: {
          total: totalUsers,
          byRole: await getUserCountsByRole()
        },
        appointments: {
          total: totalAppointments,
          byStatus: await getAppointmentCountsByStatus()
        },
        sessions: {
          total: totalSessions
        },
        payments: {
          total: totalPayments,
          totalRevenue
        },
        devices: {
          active: activeDevices,
          total: await prisma.device.count()
        },
        technicians: {
          online: onlineTechnicians,
          total: await prisma.technician.count()
        },
        engagement: {
          dau,
          wau,
          mau
        }
      }
    });
  });

  // Get audit logs
  fastify.get('/audit', {
    preHandler: [requireRole([UserRole.ADMIN, UserRole.PLATFORM_OPS])],
    schema: {
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          entityType: { type: 'string' },
          entityId: { type: 'string' },
          action: { type: 'string' },
          userId: { type: 'string' },
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 50 }
        }
      }
    }
  }, async (request, reply) => {
    const { entityType, entityId, action, userId, page = 1, limit = 50 } = request.query as any;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (action) where.action = action;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            include: {
              profile: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.auditLog.count({ where })
    ]);

    reply.send({
      success: true,
      data: logs,
      meta: {
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  });

  // Get/Create geofences
  fastify.get('/geofences', {
    preHandler: [requireRole([UserRole.ADMIN, UserRole.PLATFORM_OPS])],
    schema: {
      tags: ['Admin'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const geofences = await prisma.geofence.findMany({
      orderBy: { name: 'asc' }
    });

    reply.send({
      success: true,
      data: geofences
    });
  });

  fastify.post('/geofences', {
    preHandler: [requireRole([UserRole.ADMIN, UserRole.PLATFORM_OPS])],
    schema: {
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'polygon', 'city', 'region'],
        properties: {
          name: { type: 'string' },
          polygon: { type: 'object' },
          city: { type: 'string' },
          region: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const geofenceData = request.body as any;

    const geofence = await prisma.geofence.create({
      data: geofenceData
    });

    // Log creation
    await auditLog(prisma, {
      userId: user.id,
      entityType: 'Geofence',
      entityId: geofence.id,
      action: 'CREATE',
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

    reply.status(201).send({
      success: true,
      data: geofence
    });
  });
}

async function getUserCountsByRole() {
  const counts = await prisma.user.groupBy({
    by: ['role'],
    _count: { role: true }
  });

  return counts.reduce((acc, item) => {
    acc[item.role] = item._count.role;
    return acc;
  }, {} as Record<string, number>);
}

async function getAppointmentCountsByStatus() {
  const counts = await prisma.appointment.groupBy({
    by: ['status'],
    _count: { status: true }
  });

  return counts.reduce((acc, item) => {
    acc[item.status] = item._count.status;
    return acc;
  }, {} as Record<string, number>);
}