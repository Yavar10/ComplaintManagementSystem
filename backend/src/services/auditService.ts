import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../config/index.js';

export interface AuditLogParams {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  previousValues?: any;
  newValues?: any;
  reason?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
}

export async function logAuditEvent(
  params: AuditLogParams,
  tx?: Prisma.TransactionClient | PrismaClient
): Promise<void> {
  const db = tx || prisma;
  try {
    await db.auditLog.create({
      data: {
        actorUserId: params.actorUserId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        previousValues: params.previousValues ? JSON.parse(JSON.stringify(params.previousValues)) : undefined,
        newValues: params.newValues ? JSON.parse(JSON.stringify(params.newValues)) : undefined,
        reason: params.reason || null,
        requestId: params.requestId || null,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error('[AuditLog Error]: Failed to persist audit record:', error);
  }
}
