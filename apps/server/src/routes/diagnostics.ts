import { FastifyInstance } from 'fastify';
import { AppError } from '../utils/errors.js';

export async function diagnosticsRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify;

  // Health check - no DB access
  fastify.get('/health', {
    schema: {
      tags: ['Diagnostics'],
      response: {
        200: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            uptimeSec: { type: 'number' },
            env: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    reply.send({
      ok: true,
      uptimeSec: Math.floor(process.uptime()),
      env: process.env.NODE_ENV || 'development'
    });
  });

  // Database readiness check
  fastify.get('/ready', {
    schema: {
      tags: ['Diagnostics'],
      response: {
        200: {
          type: 'object',
          properties: {
            ready: { type: 'boolean' }
          }
        },
        503: {
          type: 'object',
          properties: {
            ready: { type: 'boolean' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      reply.send({ ready: true });
    } catch (error) {
      reply.status(503).send({
        ready: false,
        error: 'db_unreachable'
      });
    }
  });

  // Test write endpoint with rate limiting
  fastify.post('/v1/debug/test-write', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute'
      }
    },
    schema: {
      tags: ['Debug'],
      body: {
        type: 'object',
        properties: {
          note: { type: 'string' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            saved: { type: 'boolean' },
            id: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { note } = request.body as { note?: string };

    try {
      const debugRecord = await prisma.auditLog.create({
        data: {
          entityType: 'Debug',
          entityId: 'test-write',
          action: 'TEST_WRITE',
          diff: { note: note || 'Test write operation' },
          ip: request.ip,
          userAgent: request.headers['user-agent']
        }
      });

      reply.status(201).send({
        saved: true,
        id: debugRecord.id
      });
    } catch (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to save test record', 500);
    }
  });

  // Data summary endpoint
  fastify.get('/v1/debug/summary', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute'
      }
    },
    schema: {
      tags: ['Debug'],
      response: {
        200: {
          type: 'object',
          properties: {
            counts: {
              type: 'object',
              properties: {
                users: { type: 'number' },
                appointments: { type: 'number' },
                sessions: { type: 'number' },
                readings: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const [users, appointments, sessions, readings] = await Promise.all([
        prisma.user.count().catch(() => 0),
        prisma.appointment.count().catch(() => 0),
        prisma.session.count().catch(() => 0),
        prisma.reading.count().catch(() => 0)
      ]);

      reply.send({
        counts: {
          users,
          appointments,
          sessions,
          readings
        }
      });
    } catch (error) {
      // Return zeros if any table doesn't exist
      reply.send({
        counts: {
          users: 0,
          appointments: 0,
          sessions: 0,
          readings: 0
        }
      });
    }
  });
}