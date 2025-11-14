import { FastifyInstance } from 'fastify';
import { CreateReadingDto, UserRole } from '@telemedicine/shared';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../utils/errors.js';
import { auditLog } from '../services/audit.js';
import { mapToFHIR } from '../services/fhir.js';

export async function sessionRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify;

  // Create session
  fastify.post('/', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Sessions'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['appointmentId'],
        properties: {
          appointmentId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { appointmentId } = request.body as { appointmentId: string };

    // Verify appointment exists and user has access
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId }
    });

    if (!appointment) {
      throw new AppError('NOT_FOUND', 'Appointment not found', 404);
    }

    const hasAccess = 
      user.id === appointment.patientId ||
      user.id === appointment.doctorId ||
      user.id === appointment.technicianId;

    if (!hasAccess) {
      throw new AppError('FORBIDDEN', 'Access denied', 403);
    }

    // Check if session already exists
    const existingSession = await prisma.session.findFirst({
      where: {
        appointmentId,
        status: 'OPEN'
      }
    });

    if (existingSession) {
      reply.send({
        success: true,
        data: existingSession
      });
      return;
    }

    const session = await prisma.session.create({
      data: {
        appointmentId
      }
    });

    // Log session creation
    await auditLog(prisma, {
      userId: user.id,
      entityType: 'Session',
      entityId: session.id,
      action: 'CREATE',
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

    reply.status(201).send({
      success: true,
      data: session
    });
  });

  // Close session
  fastify.post('/:id/close', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Sessions'],
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
          summary: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const { summary } = request.body as { summary?: string };

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        appointment: true
      }
    });

    if (!session) {
      throw new AppError('NOT_FOUND', 'Session not found', 404);
    }

    // Check permissions
    const hasAccess = 
      user.id === session.appointment.patientId ||
      user.id === session.appointment.doctorId ||
      user.id === session.appointment.technicianId;

    if (!hasAccess) {
      throw new AppError('FORBIDDEN', 'Access denied', 403);
    }

    const updatedSession = await prisma.session.update({
      where: { id },
      data: {
        status: 'CLOSED',
        endedAt: new Date(),
        summary
      }
    });

    // Log session closure
    await auditLog(prisma, {
      userId: user.id,
      entityType: 'Session',
      entityId: id,
      action: 'CLOSE',
      diff: { summary },
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

    reply.send({
      success: true,
      data: updatedSession
    });
  });

  // Submit reading
  fastify.post('/:id/readings', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Sessions'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      body: CreateReadingDto
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { id: sessionId } = request.params as { id: string };
    const readingData = request.body;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        appointment: true
      }
    });

    if (!session) {
      throw new AppError('NOT_FOUND', 'Session not found', 404);
    }

    // Only technician can submit readings
    if (user.id !== session.appointment.technicianId) {
      throw new AppError('FORBIDDEN', 'Only assigned technician can submit readings', 403);
    }

    // Verify device exists and is accessible
    const device = await prisma.device.findUnique({
      where: { id: readingData.deviceId }
    });

    if (!device) {
      throw new AppError('NOT_FOUND', 'Device not found', 404);
    }

    if (device.ownerTechnicianId !== user.id) {
      throw new AppError('FORBIDDEN', 'Device not owned by technician', 403);
    }

    // Create FHIR bundle
    const fhirBundle = await mapToFHIR(device, readingData);

    const reading = await prisma.reading.create({
      data: {
        sessionId,
        deviceId: readingData.deviceId,
        type: readingData.type,
        payload: readingData.payload,
        capturedAt: readingData.capturedAt ? new Date(readingData.capturedAt) : new Date(),
        fhirBundle
      },
      include: {
        device: true
      }
    });

    // Emit reading via Socket.IO
    const io = (fastify as any).io;
    if (io) {
      io.to(`sessions:${sessionId}`).emit('reading:new', {
        sessionId,
        reading
      });
    }

    // Log reading submission
    await auditLog(prisma, {
      userId: user.id,
      entityType: 'Reading',
      entityId: reading.id,
      action: 'CREATE',
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

    reply.status(201).send({
      success: true,
      data: reading
    });
  });

  // Get session readings
  fastify.get('/:id/readings', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Sessions'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          cursor: { type: 'string' },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 50 }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { id: sessionId } = request.params as { id: string };
    const { cursor, limit = 50 } = request.query as any;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        appointment: true
      }
    });

    if (!session) {
      throw new AppError('NOT_FOUND', 'Session not found', 404);
    }

    // Check access
    const hasAccess = 
      user.id === session.appointment.patientId ||
      user.id === session.appointment.doctorId ||
      user.id === session.appointment.technicianId ||
      [UserRole.ADMIN, UserRole.PLATFORM_OPS].includes(user.role);

    if (!hasAccess) {
      throw new AppError('FORBIDDEN', 'Access denied', 403);
    }

    const readings = await prisma.reading.findMany({
      where: {
        sessionId,
        ...(cursor && {
          id: {
            gt: cursor
          }
        })
      },
      include: {
        device: true
      },
      orderBy: { capturedAt: 'asc' },
      take: limit
    });

    reply.send({
      success: true,
      data: readings,
      meta: {
        cursor: readings.length > 0 ? readings[readings.length - 1].id : null,
        hasMore: readings.length === limit
      }
    });
  });

  // Get FHIR bundle for session
  fastify.get('/:id/fhir-bundle', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Sessions'],
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
    const { id: sessionId } = request.params as { id: string };

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        appointment: {
          include: {
            patient: {
              include: {
                profile: true
              }
            }
          }
        },
        readings: {
          include: {
            device: true
          }
        }
      }
    });

    if (!session) {
      throw new AppError('NOT_FOUND', 'Session not found', 404);
    }

    // Check access
    const hasAccess = 
      user.id === session.appointment.patientId ||
      user.id === session.appointment.doctorId ||
      user.id === session.appointment.technicianId ||
      [UserRole.ADMIN, UserRole.PLATFORM_OPS, UserRole.DOCTOR].includes(user.role);

    if (!hasAccess) {
      throw new AppError('FORBIDDEN', 'Access denied', 403);
    }

    // Create aggregated FHIR bundle
    const bundle = {
      resourceType: 'Bundle',
      id: sessionId,
      type: 'collection',
      timestamp: session.startedAt.toISOString(),
      entry: session.readings.map(reading => ({
        resource: reading.fhirBundle,
        fullUrl: `urn:uuid:${reading.id}`
      }))
    };

    reply.send({
      success: true,
      data: bundle
    });
  });
}