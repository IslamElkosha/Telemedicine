import { FastifyInstance } from 'fastify';
import { PairDeviceDto, UserRole } from '@telemedicine/shared';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { AppError } from '../utils/errors.js';
import { auditLog } from '../services/audit.js';

export async function deviceRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify;

  // Pair device
  fastify.post('/pair', {
    preHandler: [requireRole([UserRole.TECHNICIAN, UserRole.FREELANCE_TECHNICIAN])],
    schema: {
      tags: ['Devices'],
      security: [{ bearerAuth: [] }],
      body: PairDeviceDto
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { pairingCode, kitId } = request.body;

    // Find device by pairing code
    const device = await prisma.device.findUnique({
      where: { pairingCode }
    });

    if (!device) {
      throw new AppError('NOT_FOUND', 'Device not found with this pairing code', 404);
    }

    if (device.ownerTechnicianId && device.ownerTechnicianId !== user.id) {
      throw new AppError('CONFLICT', 'Device is already paired to another technician', 409);
    }

    // Get technician's kit if not specified
    let targetKitId = kitId;
    if (!targetKitId) {
      const technician = await prisma.technician.findUnique({
        where: { id: user.id }
      });
      targetKitId = technician?.kitId;
    }

    if (!targetKitId) {
      throw new AppError('VALIDATION_ERROR', 'No kit specified and technician has no assigned kit', 400);
    }

    // Update device
    const updatedDevice = await prisma.device.update({
      where: { id: device.id },
      data: {
        ownerTechnicianId: user.id,
        assignedKitId: targetKitId,
        status: 'ACTIVE'
      }
    });

    // Log pairing
    await auditLog(prisma, {
      userId: user.id,
      entityType: 'Device',
      entityId: device.id,
      action: 'PAIR',
      diff: { kitId: targetKitId },
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

    reply.send({
      success: true,
      data: updatedDevice
    });
  });

  // Get device details
  fastify.get('/:id', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Devices'],
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

    const device = await prisma.device.findUnique({
      where: { id },
      include: {
        ownerTechnician: {
          include: {
            user: {
              include: {
                profile: true
              }
            }
          }
        },
        assignedKit: true
      }
    });

    if (!device) {
      throw new AppError('NOT_FOUND', 'Device not found', 404);
    }

    // Check access permissions
    const hasAccess = 
      device.ownerTechnicianId === user.id ||
      [UserRole.ADMIN, UserRole.PLATFORM_OPS].includes(user.role);

    if (!hasAccess) {
      throw new AppError('FORBIDDEN', 'Access denied', 403);
    }

    reply.send({
      success: true,
      data: device
    });
  });

  // Update device
  fastify.patch('/:id', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Devices'],
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
        properties: {
          status: { type: 'string', enum: ['ACTIVE', 'RETIRED'] },
          fhirMapping: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const updates = request.body as any;

    const device = await prisma.device.findUnique({
      where: { id }
    });

    if (!device) {
      throw new AppError('NOT_FOUND', 'Device not found', 404);
    }

    // Check permissions
    const canUpdate = 
      device.ownerTechnicianId === user.id ||
      [UserRole.ADMIN, UserRole.PLATFORM_OPS].includes(user.role);

    if (!canUpdate) {
      throw new AppError('FORBIDDEN', 'Cannot update this device', 403);
    }

    const updatedDevice = await prisma.device.update({
      where: { id },
      data: updates
    });

    // Log update
    await auditLog(prisma, {
      userId: user.id,
      entityType: 'Device',
      entityId: id,
      action: 'UPDATE',
      diff: updates,
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

    reply.send({
      success: true,
      data: updatedDevice
    });
  });

  // Get device FHIR mapping
  fastify.get('/:id/fhir-mapping', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Devices'],
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

    const device = await prisma.device.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        fhirMapping: true,
        ownerTechnicianId: true
      }
    });

    if (!device) {
      throw new AppError('NOT_FOUND', 'Device not found', 404);
    }

    // Check access
    const hasAccess = 
      device.ownerTechnicianId === user.id ||
      [UserRole.ADMIN, UserRole.PLATFORM_OPS, UserRole.DOCTOR].includes(user.role);

    if (!hasAccess) {
      throw new AppError('FORBIDDEN', 'Access denied', 403);
    }

    reply.send({
      success: true,
      data: {
        deviceId: device.id,
        deviceType: device.type,
        fhirMapping: device.fhirMapping
      }
    });
  });

  // Update device FHIR mapping
  fastify.put('/:id/fhir-mapping', {
    preHandler: [requireRole([UserRole.ADMIN, UserRole.PLATFORM_OPS, UserRole.DOCTOR])],
    schema: {
      tags: ['Devices'],
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
        required: ['fhirMapping'],
        properties: {
          fhirMapping: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const { fhirMapping } = request.body as { fhirMapping: any };

    const device = await prisma.device.update({
      where: { id },
      data: { fhirMapping }
    });

    // Log update
    await auditLog(prisma, {
      userId: user.id,
      entityType: 'Device',
      entityId: id,
      action: 'UPDATE_FHIR_MAPPING',
      diff: { fhirMapping },
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

    reply.send({
      success: true,
      data: device
    });
  });
}