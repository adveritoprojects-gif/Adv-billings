import { systemDb } from "@/server/db";

import type { Permission, Role, RolePermission } from "@prisma/client";

type MembershipWithRole = {
  id: string;
  organizationId: string;
  userId: string;
  roleId: string;
  status: string;
  joinedAt: Date;
  role: Role & {
    rolePermissions: (RolePermission & { permission: Permission })[];
  };
};

const membershipInclude = {
  role: {
    include: {
      rolePermissions: {
        include: { permission: true },
      },
    },
  },
} as const;

export function findUserForAuthByEmail(email: string) {
  return systemDb.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
}

export function findSessionByTokenHash(tokenHash: string) {
  return systemDb.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
}

export function deleteSessionById(sessionId: string) {
  return systemDb.session.deleteMany({ where: { id: sessionId } });
}

export function deleteSessionByTokenHash(tokenHash: string) {
  return systemDb.session.deleteMany({ where: { tokenHash } });
}

export function touchUserLogin(userId: string) {
  return systemDb.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
}

export function setSessionOrganization(
  sessionId: string,
  organizationId: string,
) {
  return systemDb.session.update({
    where: { id: sessionId },
    data: { organizationId },
  });
}

export function listActiveMemberships(userId: string) {
  return systemDb.organizationMember.findMany({
    where: { userId, status: "ACTIVE" },
    include: membershipInclude,
    orderBy: { joinedAt: "asc" },
  }) as Promise<MembershipWithRole[]>;
}

export function findActiveMembership(
  userId: string,
  organizationId: string,
) {
  return systemDb.organizationMember.findFirst({
    where: { userId, organizationId, status: "ACTIVE" },
    include: membershipInclude,
  }) as Promise<MembershipWithRole | null>;
}

export function createSessionRecord(input: {
  userId: string;
  organizationId: string;
  tokenHash: string;
  expiresAt: Date;
  ip?: string | null;
  userAgent?: string | null;
}) {
  return systemDb.session.create({
    data: {
      userId: input.userId,
      organizationId: input.organizationId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}
