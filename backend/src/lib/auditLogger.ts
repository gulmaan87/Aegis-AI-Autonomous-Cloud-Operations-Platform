import db from './db';

export interface AuditActionParams {
  userId?: string;
  userEmail?: string;
  action: string;
  resourceTarget: string;
  details?: Record<string, any> | string;
  ipAddress?: string;
}

export async function logAuditAction(params: AuditActionParams) {
  try {
    return await db.auditLog.create({
      data: {
        userId: params.userId,
        userEmail: params.userEmail || 'system',
        action: params.action,
        resourceTarget: params.resourceTarget,
        details: params.details
          ? typeof params.details === 'string'
            ? params.details
            : JSON.stringify(params.details)
          : null,
        ipAddress: params.ipAddress || '127.0.0.1',
      },
    });
  } catch (err) {
    console.error('[auditLogger] Failed to write audit log:', err);
    return null;
  }
}
