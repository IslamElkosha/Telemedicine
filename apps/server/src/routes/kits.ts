import { FastifyInstance } from 'fastify';
import { UserRole } from '@telemedicine/shared';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { AppError } from '../utils/errors.js';
import { auditLog } from '../services/audit.js';

export async function kitRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify;

  // Get technician's kits
  fastify.get('/me', {
    preHandler: [requireRole([UserRole.TECHNICIAN, UserRole.FREELANCE_TECHNICIAN])],
    schema: {
      tags: ['Kits'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const user = request.user!;

    const technician = await prisma.technician.findUnique({
      where: { id: user.id },
      include: {
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
      data: technician.kit ? [technician.kit] : []
    });
  });

  // Update kit status
  fastify.patch('/me', {
    preHandler: [requireRole([UserRole.TECHNICIAN, UserRole.FREELANCE_TECHNICIAN])],
    schema: {
      tags: ['Kits'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['ASSIGNED', 'IN_STOCK', 'MAINTENANCE'] }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { status } = request.body as { status: string };

    const technician = await prisma.technician.findUnique({
      where: { id: user.id }
    });

    if (!technician?.kitId) {
      throw new AppError('NOT_FOUND', 'No kit assigned to technician', 404);
    }

    const kit = await prisma.kit.update({
      where: { id: technician.kitId },
      data: { status: status as any },
      include: {
        devices: true
      }
    });

    // Log kit status update
    await auditLog(prisma, {
      userId: user.id,
      entityType: 'Kit',
      entityId: kit.id,
      action: 'STATUS_UPDATE',
      diff: { status },
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

    reply.send({
      success: true,
      data: kit
    });
  });
}