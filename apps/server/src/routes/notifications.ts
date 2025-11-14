import { FastifyInstance } from 'fastify';
import { UserRole } from '@telemedicine/shared';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { AppError } from '../utils/errors.js';

export async function notificationRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify;

  // Get user notifications
  fastify.get('/', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Notifications'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['SCHEDULED', 'SENT', 'FAILED'] },
          channel: { type: 'string', enum: ['IN_APP', 'SMS', 'EMAIL', 'WHATSAPP'] },
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { status, channel, page = 1, limit = 20 } = request.query as any;

    const skip = (page - 1) * limit;
    const where: any = { userId: user.id };

    if (status) where.status = status;
    if (channel) where.channel = channel;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.notification.count({ where })
    ]);

    reply.send({
      success: true,
      data: notifications,
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

  // Mark notification as read
  fastify.patch('/:id/read', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Notifications'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

    // Verify notification belongs to user
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId: user.id
      }
    });

    if (!notification) {
      throw new AppError('NOT_FOUND', 'Notification not found', 404);
    }

    // Mark as read by updating data field
    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: {
        data: {
          ...(notification.data as any || {}),
          readAt: new Date().toISOString()
        }
      }
    });

    reply.send({
      success: true,
      data: updatedNotification
    });
  });

  // Create notification (admin only)
  fastify.post('/', {
    preHandler: [requireRole([UserRole.ADMIN, UserRole.PLATFORM_OPS, UserRole.HOSPITAL_ADMIN])],
    schema: {
      tags: ['Notifications'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['title', 'body', 'channel'],
        properties: {
          title: { type: 'string' },
          body: { type: 'string' },
          channel: { type: 'string', enum: ['IN_APP', 'SMS', 'EMAIL', 'WHATSAPP'] },
          targetRole: { type: 'string' },
          targetHospitalId: { type: 'string' },
          targetAreaCode: { type: 'string' },
          scheduledFor: { type: 'string', format: 'date-time' },
          data: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { 
      title, 
      body, 
      channel, 
      targetRole, 
      targetHospitalId, 
      targetAreaCode, 
      scheduledFor,
      data 
    } = request.body as any;

    // Build target user query
    let targetUsers: string[] = [];

    if (targetRole) {
      const users = await prisma.user.findMany({
        where: { role: targetRole },
        select: { id: true }
      });
      targetUsers = users.map(u => u.id);
    } else if (targetHospitalId) {
      const hospitalUsers = await prisma.hospitalUser.findMany({
        where: { hospitalId: targetHospitalId },
        select: { userId: true }
      });
      targetUsers = hospitalUsers.map(hu => hu.userId);
    } else if (targetAreaCode) {
      const technicians = await prisma.technician.findMany({
        where: {
          coverageAreas: {
            path: '$',
            array_contains: [targetAreaCode]
          }
        },
        select: { id: true }
      });
      targetUsers = technicians.map(t => t.id);
    }

    // Create notifications for target users
    const notifications = await Promise.all(
      targetUsers.map(userId =>
        prisma.notification.create({
          data: {
            userId,
            title,
            body,
            channel: channel as any,
            data,
            scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined
          }
        })
      )
    );

    reply.status(201).send({
      success: true,
      data: {
        created: notifications.length,
        notifications: notifications.slice(0, 10) // Return first 10
      }
    });
  });
}