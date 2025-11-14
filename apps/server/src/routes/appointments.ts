import { FastifyInstance } from 'fastify';
import { CreateAppointmentDto, UpdateAppointmentDto, UserRole, AppointmentStatus } from '@telemedicine/shared';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { AppError } from '../utils/errors.js';
import { auditLog } from '../services/audit.js';
import { assignTechnician } from '../services/assignment.js';

export async function appointmentRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify;

  // Get appointments (role-aware)
  fastify.get('/', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Appointments'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          areaCode: { type: 'string' },
          hospitalId: { type: 'string' },
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { status, startDate, endDate, areaCode, hospitalId, page = 1, limit = 20 } = request.query as any;

    const skip = (page - 1) * limit;

    // Build where clause based on user role
    let where: any = {};

    switch (user.role) {
      case UserRole.PATIENT:
        where.patientId = user.id;
        break;
      case UserRole.DOCTOR:
        where.doctorId = user.id;
        break;
      case UserRole.TECHNICIAN:
      case UserRole.FREELANCE_TECHNICIAN:
        where.technicianId = user.id;
        break;
      case UserRole.HOSPITAL_ADMIN:
        // Get user's hospital
        const hospitalUser = await prisma.hospitalUser.findFirst({
          where: { userId: user.id }
        });
        if (hospitalUser) {
          where.hospitalId = hospitalUser.hospitalId;
        }
        break;
      case UserRole.ADMIN:
      case UserRole.PLATFORM_OPS:
        // Can see all appointments
        break;
      default:
        throw new AppError('FORBIDDEN', 'Access denied', 403);
    }

    // Add filters
    if (status) where.status = status;
    if (hospitalId) where.hospitalId = hospitalId;
    if (areaCode) where.assignedAreaCode = areaCode;
    if (startDate || endDate) {
      where.startAt = {};
      if (startDate) where.startAt.gte = new Date(startDate);
      if (endDate) where.startAt.lte = new Date(endDate);
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          patient: { include: { profile: true } },
          doctor: { include: { profile: true } },
          technician: { include: { profile: true } },
          hospital: true,
          address: true,
          sessions: {
            include: {
              readings: true
            }
          }
        },
        orderBy: { startAt: 'asc' },
        skip,
        take: limit
      }),
      prisma.appointment.count({ where })
    ]);

    reply.send({
      success: true,
      data: appointments,
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

  // Create appointment
  fastify.post('/', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Appointments'],
      security: [{ bearerAuth: [] }],
      body: CreateAppointmentDto
    }
  }, async (request, reply) => {
    const user = request.user!;
    const appointmentData = request.body;

    // Only patients can create appointments for themselves
    if (user.role === UserRole.PATIENT) {
      // Auto-assign technician
      const assignedTechnician = await assignTechnician(prisma, {
        areaCode: appointmentData.assignedAreaCode,
        addressId: appointmentData.addressId,
        startAt: new Date(appointmentData.startAt)
      });

      const appointment = await prisma.appointment.create({
        data: {
          ...appointmentData,
          patientId: user.id,
          technicianId: assignedTechnician?.id,
          createdByUserId: user.id,
          startAt: new Date(appointmentData.startAt),
          endAt: new Date(appointmentData.endAt)
        },
        include: {
          patient: { include: { profile: true } },
          doctor: { include: { profile: true } },
          technician: { include: { profile: true } },
          address: true
        }
      });

      // Log creation
      await auditLog(prisma, {
        userId: user.id,
        entityType: 'Appointment',
        entityId: appointment.id,
        action: 'CREATE',
        ip: request.ip,
        userAgent: request.headers['user-agent']
      });

      reply.status(201).send({
        success: true,
        data: appointment
      });
    } else {
      throw new AppError('FORBIDDEN', 'Only patients can create appointments', 403);
    }
  });

  // Update appointment
  fastify.patch('/:id', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Appointments'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      body: UpdateAppointmentDto
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const updates = request.body;

    // Get existing appointment
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id }
    });

    if (!existingAppointment) {
      throw new AppError('NOT_FOUND', 'Appointment not found', 404);
    }

    // Check permissions
    const canUpdate = 
      user.id === existingAppointment.patientId ||
      user.id === existingAppointment.doctorId ||
      user.id === existingAppointment.technicianId ||
      [UserRole.ADMIN, UserRole.PLATFORM_OPS, UserRole.HOSPITAL_ADMIN].includes(user.role);

    if (!canUpdate) {
      throw new AppError('FORBIDDEN', 'Cannot update this appointment', 403);
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: updates,
      include: {
        patient: { include: { profile: true } },
        doctor: { include: { profile: true } },
        technician: { include: { profile: true } },
        address: true
      }
    });

    // Log update
    await auditLog(prisma, {
      userId: user.id,
      entityType: 'Appointment',
      entityId: id,
      action: 'UPDATE',
      diff: updates,
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

    // Emit status change via Socket.IO
    if (updates.status) {
      const io = (fastify as any).io;
      if (io) {
        io.to(`appointments:${id}`).emit('appointment:status-changed', {
          appointmentId: id,
          status: updates.status
        });
      }
    }

    reply.send({
      success: true,
      data: appointment
    });
  });

  // Confirm appointment
  fastify.post('/:id/confirm', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Appointments'],
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

    const appointment = await prisma.appointment.findUnique({
      where: { id }
    });

    if (!appointment) {
      throw new AppError('NOT_FOUND', 'Appointment not found', 404);
    }

    // Only technician or admin can confirm
    const canConfirm = 
      user.id === appointment.technicianId ||
      [UserRole.ADMIN, UserRole.PLATFORM_OPS].includes(user.role);

    if (!canConfirm) {
      throw new AppError('FORBIDDEN', 'Cannot confirm this appointment', 403);
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CONFIRMED },
      include: {
        patient: { include: { profile: true } },
        doctor: { include: { profile: true } },
        technician: { include: { profile: true } }
      }
    });

    // Log confirmation
    await auditLog(prisma, {
      userId: user.id,
      entityType: 'Appointment',
      entityId: id,
      action: 'CONFIRM',
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

    reply.send({
      success: true,
      data: updatedAppointment
    });
  });

  // Start appointment
  fastify.post('/:id/start', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Appointments'],
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

    const appointment = await prisma.appointment.findUnique({
      where: { id }
    });

    if (!appointment) {
      throw new AppError('NOT_FOUND', 'Appointment not found', 404);
    }

    // Only assigned technician or doctor can start
    const canStart = 
      user.id === appointment.technicianId ||
      user.id === appointment.doctorId ||
      [UserRole.ADMIN, UserRole.PLATFORM_OPS].includes(user.role);

    if (!canStart) {
      throw new AppError('FORBIDDEN', 'Cannot start this appointment', 403);
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.IN_PROGRESS }
    });

    // Create session
    const session = await prisma.session.create({
      data: {
        appointmentId: id
      }
    });

    // Log start
    await auditLog(prisma, {
      userId: user.id,
      entityType: 'Appointment',
      entityId: id,
      action: 'START',
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

    reply.send({
      success: true,
      data: {
        appointment: updatedAppointment,
        session
      }
    });
  });

  // Complete appointment
  fastify.post('/:id/complete', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Appointments'],
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

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        sessions: true
      }
    });

    if (!appointment) {
      throw new AppError('NOT_FOUND', 'Appointment not found', 404);
    }

    // Only assigned technician or doctor can complete
    const canComplete = 
      user.id === appointment.technicianId ||
      user.id === appointment.doctorId ||
      [UserRole.ADMIN, UserRole.PLATFORM_OPS].includes(user.role);

    if (!canComplete) {
      throw new AppError('FORBIDDEN', 'Cannot complete this appointment', 403);
    }

    // Update appointment and close any open sessions
    const [updatedAppointment] = await Promise.all([
      prisma.appointment.update({
        where: { id },
        data: { status: AppointmentStatus.COMPLETED }
      }),
      // Close any open sessions
      prisma.session.updateMany({
        where: {
          appointmentId: id,
          status: 'OPEN'
        },
        data: {
          status: 'CLOSED',
          endedAt: new Date(),
          summary
        }
      })
    ]);

    // Log completion
    await auditLog(prisma, {
      userId: user.id,
      entityType: 'Appointment',
      entityId: id,
      action: 'COMPLETE',
      diff: { summary },
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

    reply.send({
      success: true,
      data: updatedAppointment
    });
  });

  // Cancel appointment
  fastify.post('/:id/cancel', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Appointments'],
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
          reason: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const { reason } = request.body as { reason?: string };

    const appointment = await prisma.appointment.findUnique({
      where: { id }
    });

    if (!appointment) {
      throw new AppError('NOT_FOUND', 'Appointment not found', 404);
    }

    // Check cancellation permissions and timing
    const canCancel = 
      user.id === appointment.patientId ||
      user.id === appointment.doctorId ||
      user.id === appointment.technicianId ||
      [UserRole.ADMIN, UserRole.PLATFORM_OPS].includes(user.role);

    if (!canCancel) {
      throw new AppError('FORBIDDEN', 'Cannot cancel this appointment', 403);
    }

    // Check if cancellation is within allowed timeframe (>12 hours)
    const hoursUntilAppointment = (appointment.startAt.getTime() - Date.now()) / (1000 * 60 * 60);
    const requiresAdminOverride = hoursUntilAppointment <= 12 && 
      ![UserRole.ADMIN, UserRole.PLATFORM_OPS].includes(user.role);

    if (requiresAdminOverride) {
      throw new AppError('CONFLICT', 'Cancellation requires admin approval for appointments within 12 hours', 409);
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: { 
        status: AppointmentStatus.CANCELLED,
        notes: reason ? `Cancelled: ${reason}` : 'Cancelled'
      }
    });

    // Log cancellation
    await auditLog(prisma, {
      userId: user.id,
      entityType: 'Appointment',
      entityId: id,
      action: 'CANCEL',
      diff: { reason },
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

    reply.send({
      success: true,
      data: updatedAppointment
    });
  });

  // Get appointment timeline (audit log)
  fastify.get('/:id/timeline', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Appointments'],
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

    // Check if user has access to this appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id }
    });

    if (!appointment) {
      throw new AppError('NOT_FOUND', 'Appointment not found', 404);
    }

    const hasAccess = 
      user.id === appointment.patientId ||
      user.id === appointment.doctorId ||
      user.id === appointment.technicianId ||
      [UserRole.ADMIN, UserRole.PLATFORM_OPS, UserRole.HOSPITAL_ADMIN].includes(user.role);

    if (!hasAccess) {
      throw new AppError('FORBIDDEN', 'Access denied', 403);
    }

    const timeline = await prisma.auditLog.findMany({
      where: {
        entityType: 'Appointment',
        entityId: id
      },
      include: {
        user: {
          include: {
            profile: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    reply.send({
      success: true,
      data: timeline
    });
  });
}