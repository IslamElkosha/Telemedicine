import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  
  // Database
  DATABASE_URL: z.string().url(),
  
  // Redis
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // CORS
  APP_ORIGIN: z.string().url().default('http://localhost:5173'),
  
  // Storage
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  
  // Email
  EMAIL_PROVIDER: z.enum(['RESEND', 'STUB']).default('STUB'),
  RESEND_API_KEY: z.string().optional(),
  
  // SMS
  SMS_PROVIDER: z.enum(['INFOBIP', 'STUB']).default('STUB'),
  INFOBIP_API_KEY: z.string().optional(),
  
  // Payments
  PAYMENT_PROVIDER: z.enum(['STRIPE', 'ACCEPT', 'STUB']).default('STUB'),
  STRIPE_SECRET: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  ACCEPT_API_KEY: z.string().optional(),
  ACCEPT_IFRAME_ID: z.string().optional(),
  ACCEPT_HMAC: z.string().optional(),
});

export const config = envSchema.parse(process.env);