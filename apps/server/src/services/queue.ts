import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

let emailQueue: Queue;
let smsQueue: Queue;
let invoiceQueue: Queue;

export async function setupQueues(redis: Redis) {
  // Initialize queues
  emailQueue = new Queue('email', { connection: redis });
  smsQueue = new Queue('sms', { connection: redis });
  invoiceQueue = new Queue('invoice', { connection: redis });

  // Email worker
  const emailWorker = new Worker('email', async (job) => {
    const { to, subject, html, template, data } = job.data;
    
    logger.info(`Processing email job: ${job.id}`, { to, subject });
    
    // TODO: Implement actual email sending
    // For now, just log
    logger.info('Email sent (stub)', { to, subject });
    
    return { success: true, messageId: `stub-${Date.now()}` };
  }, { connection: redis });

  // SMS worker
  const smsWorker = new Worker('sms', async (job) => {
    const { to, message, template, data } = job.data;
    
    logger.info(`Processing SMS job: ${job.id}`, { to });
    
    // TODO: Implement actual SMS sending
    // For now, just log
    logger.info('SMS sent (stub)', { to, message });
    
    return { success: true, messageId: `stub-${Date.now()}` };
  }, { connection: redis });

  // Invoice worker
  const invoiceWorker = new Worker('invoice', async (job) => {
    const { paymentId, appointmentId } = job.data;
    
    logger.info(`Processing invoice job: ${job.id}`, { paymentId, appointmentId });
    
    // TODO: Generate PDF invoice
    // For now, just log
    logger.info('Invoice generated (stub)', { paymentId });
    
    return { success: true, pdfUrl: `https://example.com/invoices/${paymentId}.pdf` };
  }, { connection: redis });

  logger.info('Job queues initialized');

  return {
    emailQueue,
    smsQueue,
    invoiceQueue
  };
}

export async function sendEmail(data: {
  to: string;
  subject: string;
  html?: string;
  template?: string;
  data?: any;
}) {
  if (!emailQueue) {
    throw new Error('Email queue not initialized');
  }

  return emailQueue.add('send-email', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });
}

export async function sendSMS(data: {
  to: string;
  message?: string;
  template?: string;
  data?: any;
}) {
  if (!smsQueue) {
    throw new Error('SMS queue not initialized');
  }

  return smsQueue.add('send-sms', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });
}

export async function generateInvoice(data: {
  paymentId: string;
  appointmentId: string;
}) {
  if (!invoiceQueue) {
    throw new Error('Invoice queue not initialized');
  }

  return invoiceQueue.add('generate-invoice', data, {
    delay: 5000, // Generate invoice 5 seconds after payment
  });
}