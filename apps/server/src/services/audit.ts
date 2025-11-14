import { PrismaClient } from '@prisma/client';

interface AuditLogData {
  userId?: string;
  entityType: string;
  entityId: string;
  action: string;
  diff?: any;
  ip?: string;
  userAgent?: string;
}

export async function auditLog(prisma: PrismaClient, data: AuditLogData) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action,
        diff: data.diff || {},
        ip: data.ip,
        userAgent: data.userAgent,
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break the main flow
  }
}