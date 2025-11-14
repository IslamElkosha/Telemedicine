import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { LoginDto, RegisterDto, UserRole } from '@telemedicine/shared';
import { AppError } from '../utils/errors.js';
import { auditLog } from '../services/audit.js';

export async function authRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify;

  // Register
  fastify.post('/register', {
    schema: {
      tags: ['Authentication'],
      body: RegisterDto,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: { type: 'object' },
                token: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { email, password, fullName, phone, role, specialty, licenseNo, hospitalId } = request.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new AppError('ALREADY_EXISTS', 'User with this email already exists', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user with profile
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        phone,
        profile: {
          create: {
            fullName,
          }
        },
        // Create role-specific profiles
        ...(role === UserRole.PATIENT && {
          patientProfile: {
            create: {}
          }
        }),
        ...(role === UserRole.DOCTOR && {
          doctorProfile: {
            create: {
              specialty: specialty || '',
              licenseNo,
              hospitalId
            }
          }
        }),
        ...(role === UserRole.TECHNICIAN && {
          technicianProfile: {
            create: {
              isFreelance: false,
              coverageAreas: []
            }
          }
        }),
        ...(role === UserRole.FREELANCE_TECHNICIAN && {
          technicianProfile: {
            create: {
              isFreelance: true,
              coverageAreas: []
            }
          }
        })
      },
      include: {
        profile: true,
        patientProfile: true,
        doctorProfile: true,
        technicianProfile: true
      }
    });

    // Generate JWT token
    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role
    });

    // Log registration
    await auditLog(prisma, {
      userId: user.id,
      entityType: 'User',
      entityId: user.id,
      action: 'REGISTER',
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

    reply.status(201).send({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          profile: user.profile
        },
        token
      }
    });
  });

  // Login
  fastify.post('/login', {
    schema: {
      tags: ['Authentication'],
      body: LoginDto,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: { type: 'object' },
                token: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { email, password } = request.body;

    // Find user with profile
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
        patientProfile: true,
        doctorProfile: true,
        technicianProfile: true
      }
    });

    if (!user) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    // Check if user is suspended
    if (user.status === 'SUSPENDED') {
      throw new AppError('FORBIDDEN', 'Account is suspended', 403);
    }

    // Generate JWT token
    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role
    });

    // Log login
    await auditLog(prisma, {
      userId: user.id,
      entityType: 'User',
      entityId: user.id,
      action: 'LOGIN',
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

    reply.send({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          profile: user.profile,
          patientProfile: user.patientProfile,
          doctorProfile: user.doctorProfile,
          technicianProfile: user.technicianProfile
        },
        token
      }
    });
  });

  // Logout
  fastify.post('/logout', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const user = request.user!;

    // Log logout
    await auditLog(prisma, {
      userId: user.id,
      entityType: 'User',
      entityId: user.id,
      action: 'LOGOUT',
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

    reply.send({
      success: true,
      data: { message: 'Logged out successfully' }
    });
  });

  // Refresh token
  fastify.post('/refresh', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const user = request.user!;

    // Generate new token
    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role
    });

    reply.send({
      success: true,
      data: { token }
    });
  });

  // Request password reset
  fastify.post('/password/reset/request', {
    schema: {
      tags: ['Authentication'],
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' }
        }
      }
    }
  }, async (request, reply) => {
    const { email } = request.body as { email: string };

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Don't reveal if email exists
      reply.send({
        success: true,
        data: { message: 'If the email exists, a reset link has been sent' }
      });
      return;
    }

    // TODO: Generate reset token and send email
    // For now, just log the action
    await auditLog(prisma, {
      userId: user.id,
      entityType: 'User',
      entityId: user.id,
      action: 'PASSWORD_RESET_REQUEST',
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

    reply.send({
      success: true,
      data: { message: 'If the email exists, a reset link has been sent' }
    });
  });
}