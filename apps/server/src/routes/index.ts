import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.js';
import { userRoutes } from './users.js';
import { appointmentRoutes } from './appointments.js';
import { technicianRoutes } from './technicians.js';
import { deviceRoutes } from './devices.js';
import { sessionRoutes } from './sessions.js';
import { paymentRoutes } from './payments.js';
import { notificationRoutes } from './notifications.js';
import { adminRoutes } from './admin.js';
import { diagnosticsRoutes } from './diagnostics.js';

export async function setupRoutes(fastify: FastifyInstance) {
  // Diagnostics routes (public, no auth required)
  await fastify.register(diagnosticsRoutes, { prefix: '/api' });

  // API v1 routes
  await fastify.register(async function (fastify) {
    await fastify.register(authRoutes, { prefix: '/auth' });
    await fastify.register(userRoutes);
    await fastify.register(appointmentRoutes, { prefix: '/appointments' });
    await fastify.register(technicianRoutes, { prefix: '/technicians' });
    await fastify.register(deviceRoutes, { prefix: '/devices' });
    await fastify.register(sessionRoutes, { prefix: '/sessions' });
    await fastify.register(paymentRoutes, { prefix: '/payments' });
    await fastify.register(notificationRoutes, { prefix: '/notifications' });
    await fastify.register(adminRoutes, { prefix: '/admin' });
  }, { prefix: '/api/v1' });

  // Admin console routes
  await fastify.register(async function (fastify) {
    fastify.get('/', async (request, reply) => {
      return reply.type('text/html').send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>TeleMedCare Admin Console</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; margin: 0; padding: 2rem; background: #f8fafc; }
            .container { max-width: 1200px; margin: 0 auto; }
            .header { background: white; padding: 2rem; border-radius: 8px; margin-bottom: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; }
            .card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .card h3 { margin: 0 0 1rem 0; color: #1f2937; }
            .card a { color: #3b82f6; text-decoration: none; }
            .card a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>TeleMedCare Admin Console</h1>
              <p>Backend administration and monitoring dashboard</p>
            </div>
            <div class="grid">
              <div class="card">
                <h3>API Documentation</h3>
                <p><a href="/api/docs">Swagger UI</a> - Interactive API documentation</p>
              </div>
              <div class="card">
                <h3>Database</h3>
                <p><a href="http://localhost:5555" target="_blank">Prisma Studio</a> - Database browser</p>
              </div>
              <div class="card">
                <h3>System Health</h3>
                <p><a href="/health">Health Check</a> - System status</p>
              </div>
              <div class="card">
                <h3>Monitoring</h3>
                <p>Redis: Connected<br>Database: Connected<br>Socket.IO: Active</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `);
    });
  }, { prefix: '/admin' });
}