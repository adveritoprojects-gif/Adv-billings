import { db, withTenant } from "@/server/db";

import type { ActivityLevel, Prisma } from "@prisma/client";

export interface LogActivityInput {
  action: string;
  actorId?: string | null;
  entity?: string | null;
  entityId?: string | null;
  level?: ActivityLevel;
  metadata?: Prisma.InputJsonValue;
  ip?: string | null;
  userAgent?: string | null;
}

export async function logActivity(
  organizationId: string,
  input: LogActivityInput,
) {
  return withTenant(organizationId, () =>
    db.activityLog.create({
      data: {
        organizationId,
        action: input.action,
        actorId: input.actorId ?? null,
        entity: input.entity ?? null,
        entityId: input.entityId ?? null,
        level: input.level ?? "INFO",
        metadata: input.metadata,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    }),
  );
}

export async function listActivity(
  ctx: { organization: { id: string } },
  limit = 50,
) {
  return withTenant(ctx.organization.id, () =>
    db.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        level: true,
        organizationId: true,
        createdAt: true,
        actor: { select: { id: true, name: true, email: true } },
      },
    }),
  );
}
