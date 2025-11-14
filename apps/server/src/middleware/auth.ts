import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@telemedicine/shared';
import { AppError } from '../utils/errors.js';

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    
    const user = request.user as any;
    if (!allowedRoles.includes(user.role)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions', 403);
    }
  };
}

export function requireSelfOrRole(allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    
    const user = request.user as any;
    const targetUserId = (request.params as any).id || (request.params as any).userId;
    
    // Allow if user is accessing their own data or has required role
    if (user.id === targetUserId || allowedRoles.includes(user.role)) {
      return;
    }
    
    throw new AppError('FORBIDDEN', 'Access denied', 403);
  };
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      role: UserRole;
      iat: number;
      exp: number;
    };
  }
}