import { FastifyInstance } from 'fastify';
import { UserRole } from '@telemedicine/shared';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../utils/errors.js';
import { auditLog } from '../services/audit.js';
import { generateInvoice } from '../services/queue.js';

export async function paymentRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify;

  // Create payment intent
  fastify.post('/intent', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Payments'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['appointmentId'],
        properties: {
          appointmentId: { type: 'string' },
          provider: { type: 'string', enum: ['STRIPE', 'ACCEPT'], default: 'STRIPE' }
        }
      }
    }
  }, async (request, reply) => {
    const user = request.user!;
    const { appointmentId, provider = 'STRIPE' } = request.body as any;

    // Get appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        doctor: true
      }
    });

    if (!appointment) {
      throw new AppError('NOT_FOUND', 'Appointment not found', 404);
    }

    // Only patient can create payment for their appointment
    if (user.id !== appointment.patientId) {
      throw new AppError('FORBIDDEN', 'Can only pay for your own appointments', 403);
    }

    // Check if payment already exists
    const existingPayment = await prisma.payment.findFirst({
      where: {
        appointmentId,
        status: { in: ['PENDING', 'PAID'] }
      }
    });

    if (existingPayment) {
      reply.send({
        success: true,
        data: existingPayment
      });
      return;
    }

    // Create payment record
    const baseAmount = 75000; // 750 EGP in piasters
    const payment = await prisma.payment.create({
      data: {
        appointmentId,
        amountEgp: baseAmount,
        provider,
        status: 'PENDING'
      }
    });

    // TODO: Create actual payment intent with provider
    let clientSecret = '';
    let providerIntentId = '';

    if (provider === 'STRIPE') {
      // TODO: Create Stripe payment intent
      clientSecret = `pi_stub_${payment.id}`;
      providerIntentId = clientSecret;
    } else if (provider === 'ACCEPT') {
      // TODO: Create Accept payment intent
      clientSecret = `accept_stub_${payment.id}`;
      providerIntentId = clientSecret;
    }

    // Update payment with provider details
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: { providerIntentId }
    });

    // Log payment creation
    await auditLog(prisma, {
      userId: user.id,
      entityType: 'Payment',
      entityId: payment.id,
      action: 'CREATE',
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

    reply.status(201).send({
      success: true,
      data: {
        ...updatedPayment,
        clientSecret
      }
    });
  });

  // Get payment details
  fastify.get('/:id', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Payments'],
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

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        appointment: {
          include: {
            patient: true,
            doctor: true
          }
        },
        invoices: true
      }
    });

    if (!payment) {
      throw new AppError('NOT_FOUND', 'Payment not found', 404);
    }

    // Check access permissions
    const hasAccess = 
      user.id === payment.appointment.patientId ||
      user.id === payment.appointment.doctorId ||
      [UserRole.ADMIN, UserRole.PLATFORM_OPS, UserRole.HOSPITAL_ADMIN].includes(user.role);

    if (!hasAccess) {
      throw new AppError('FORBIDDEN', 'Access denied', 403);
    }

    reply.send({
      success: true,
      data: payment
    });
  });

  // Webhook handler for payment providers
  fastify.post('/webhook/:provider', {
    schema: {
      tags: ['Payments'],
      params: {
        type: 'object',
        required: ['provider'],
        properties: {
          provider: { type: 'string', enum: ['stripe', 'accept'] }
        }
      }
    }
  }, async (request, reply) => {
    const { provider } = request.params as { provider: string };
    const payload = request.body;

    // TODO: Verify webhook signature
    
    try {
      if (provider === 'stripe') {
        // Handle Stripe webhook
        const event = payload as any;
        
        if (event.type === 'payment_intent.succeeded') {
          const paymentIntent = event.data.object;
          
          // Find payment by provider intent ID
          const payment = await prisma.payment.findFirst({
            where: { providerIntentId: paymentIntent.id }
          });

          if (payment) {
            // Update payment status
            await prisma.payment.update({
              where: { id: payment.id },
              data: { status: 'PAID' }
            });

            // Update appointment payment status
            await prisma.appointment.update({
              where: { id: payment.appointmentId },
              data: { paymentStatus: 'PAID' }
            });

            // Generate invoice
            await generateInvoice({
              paymentId: payment.id,
              appointmentId: payment.appointmentId
            });

            // Log payment success
            await auditLog(prisma, {
              entityType: 'Payment',
              entityId: payment.id,
              action: 'WEBHOOK_SUCCESS',
              diff: { provider, intentId: paymentIntent.id }
            });
          }
        }
      } else if (provider === 'accept') {
        // Handle Accept webhook
        // TODO: Implement Accept webhook handling
      }

      reply.send({ received: true });
    } catch (error) {
      fastify.log.error('Webhook processing failed:', error);
      reply.status(400).send({ error: 'Webhook processing failed' });
    }
  });
}