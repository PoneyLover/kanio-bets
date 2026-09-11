import type { PrismaTransactionClient } from "../../types/prismaTx";
import { prisma } from "../../lib/prisma";
import type { AuditAction } from "../../lib/prisma";

export interface LogActionParams {
  adminId: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export const AuditService = {
  /** A appeler dans la meme transaction que l'action auditee, pour garantir l'atomicite. */
  async logAction(tx: PrismaTransactionClient, params: LogActionParams) {
    return tx.auditLog.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        reason: params.reason,
        metadata: params.metadata as never,
      },
    });
  },

  async list(filters: { targetType?: string; adminId?: string; skip?: number; take?: number } = {}) {
    return prisma.auditLog.findMany({
      where: {
        targetType: filters.targetType,
        adminId: filters.adminId,
      },
      include: { admin: { select: { username: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: filters.skip ?? 0,
      take: Math.min(filters.take ?? 100, 200),
    });
  },
};
