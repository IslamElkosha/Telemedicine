import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { config } from './config/env.js';
import { setupRoutes } from './routes/index.js';
import { setupSocketIO } from './services/socket.js';
import { setupQueues } from './services/queue.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

const redis = new Redis(config.REDIS_URL);
const pubClient = redis;
const subClient = pubClient.duplicate();

async function buildServer() {
  const fastify = Fastify({
    logger: logger,
    trustProxy: true,
  });

  // Register plugins
  await fastify.register(import('@fastify/helmet'), {
    contentSecurityPolicy: false,
  });

  await fastify.register(import('@fastify/cors'), {
    origin: [config.APP_ORIGIN, 'http://localhost:5173', 'https://comprehensive-teleme-pbkl.bolt.host'],
    credentials: true,
  });

  await fastify.register(import('@fastify/rate-limit'), {
    max: 100,
    timeWindow: '1 minute',
  });

  await fastify.register(import('@fastify/jwt'), {
    secret: config.JWT_SECRET,
    cookie: {
      cookieName: 'token',
      signed: false,
    },
  });

  await fastify.register(import('@fastify/multipart'));

  // Swagger documentation
  await fastify.register(import('@fastify/swagger'), {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'TeleMedCare API',
        description: 'Comprehensive telemedicine platform API',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:3001',
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await fastify.register(import('@fastify/swagger-ui'), {
    routePrefix: '/api/docs',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false,
    },
  });

  // Add Prisma to Fastify context
  fastify.decorate('prisma', prisma);
  fastify.decorate('redis', redis);

  // Error handler
  fastify.setErrorHandler(errorHandler);

  // Health check
  fastify.get('/health', async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      await redis.ping();
      return { status: 'ok', timestamp: new Date().toISOString() };
    } catch (error) {
      throw new Error('Health check failed');
    }
  });

  // Setup routes
  await setupRoutes(fastify);

  return fastify;
}

async function start() {
  try {
    const fastify = await buildServer();
    
    // Setup Socket.IO
    const io = new Server(fastify.server, {
      cors: {
        origin: [config.APP_ORIGIN, 'http://localhost:5173'],
        credentials: true,
      },
    });

    // Setup Redis adapter for Socket.IO
    io.adapter(createAdapter(pubClient, subClient));
    
    // Setup Socket.IO handlers
    setupSocketIO(io, prisma);

    // Setup job queues
    await setupQueues(redis);

    // Start server
    const port = config.PORT || 3001;
    await fastify.listen({ port, host: '0.0.0.0' });
    
    logger.info(`🚀 Server running on http://localhost:${port}`);
    logger.info(`📚 API docs available at http://localhost:${port}/api/docs`);
    logger.info(`🔧 Admin console at http://localhost:${port}/admin`);
    logger.info(`🩺 Diagnostics: open /diagnostics`);

  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await prisma.$disconnect();
  await redis.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await prisma.$disconnect();
  await redis.disconnect();
  process.exit(0);
});

start();