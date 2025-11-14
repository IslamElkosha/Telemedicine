import { FastifyInstance } from 'fastify';
import { UpdateProfileDto, UserRole } from '@telemedicine/shared';
import { requireAuth, requireSelfOrRole } from '../middleware/auth.js';
import { AppError } from '../utils/errors.js';
import { auditLog } from '../services/audit.js';

export async function userRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify;

  // Get current user profile
  fastify.get('/me', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Users'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const user = request.user!;

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        profile: true,
        patientProfile: true,
        doctorProfile: {
          include: {
            hospital: true
          }
        },
        technicianProfile: {
          include: {
            kit: {
              include: {
                devices: true
              }
            }
          }
        },
        addresses: true
      }
    });

    if (!userData) {
      throw new AppError('NOT_FOUND', 'User not found', 404);
    }

    reply.send({
      success: true,
      data: userData
    });
  });

  // Update user profile
  fastify.patch('/me/profile', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      body: UpdateProfileDto
    }
  }, async (request, reply) => {
    const user = request.user!;
    const updates = request.body;

    const updatedProfile = await prisma.userProfile.update({
      where: { userId: user.id },
      data: updates
    });

    // Log profile update
    await auditLog(prisma, {
      userId: user.id,
      entityType: 'UserProfile',
      entityId: user.id,
      action: 'UPDATE',
      diff: updates,
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

    reply.send({
      success: true,
      data: updatedProfile
    });
  });

  // Get user by ID (admin only)
  fastify.get('/users/:id', {
    preHandler: [requireSelfOrRole([UserRole.ADMIN, UserRole.PLATFORM_OPS, UserRole.HOSPITAL_ADMIN])],
    schema: {
      tags: ['Users'],
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
    const { id } = request.params as { id: string };

    const userData = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        patientProfile: true,
        doctorProfile: {
          include: {
            hospital: true
          }
        },
        technicianProfile: {
          include: {
            kit: {
              include: {
                devices: true
              }
            }
          }
        },
        addresses: true
      }
    });

    if (!userData) {
      throw new AppError('NOT_FOUND', 'User not found', 404);
    }

    reply.send({
      success: true,
      data: userData
    });
  });

  // Update user status (admin only)
  fastify.patch('/users/:id/status', {
    preHandler: [requireSelfOrRole([UserRole.ADMIN, UserRole.PLATFORM_OPS])],
    schema: {
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'] }
        }
      }
    }
  }, async (request, reply) => {
    const currentUser = request.user!;
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };

    const user = await prisma.user.update({
      where: { id },
      data: { status: status as any }
    });

    // Log status change
    await auditLog(prisma, {
      userId: currentUser.id,
      entityType: 'User',
      entityId: id,
      action: 'STATUS_UPDATE',
      diff: { status },
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

    reply.send({
      success: true,
      data: user
    });
  });
}