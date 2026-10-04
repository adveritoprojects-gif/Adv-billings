import type {
  PlanInterval,
  PlanKey,
  SubscriptionState,
} from "@prisma/client";
import { cache } from "react";

import { getTemplatePermissionExtras } from "@/config/industry";
import { parsePlanLimits, type PlanLimits } from "@/server/billing/types";
import { db, withTenant } from "@/server/db";

import {
  deleteSessionById,
  findActiveMembership,
  findSessionByTokenHash,
  listActiveMemberships,
  setSessionOrganization,
} from "./bootstrap";
import {
  ALL_PERMISSION_KEYS,
  isSuperAdmin,
  withTemplatePermissionExtras,
  type PermissionKey,
} from "./permissions";
import { readSessionCookie } from "./session";
import { hashSessionToken } from "./session-token";

export interface AuthContextUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface AuthContextOrganization {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
  favicon: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  businessType: string | null;
  timezone: string | null;
  currency: string | null;
  dateFormat: string | null;
  status: string;
  templateKey: string;
}

export interface AuthContextMembership {
  id: string;
  roleId: string;
  status: string;
  joinedAt: Date;
}

export interface AuthContextRole {
  id: string;
  key: string;
  name: string;
  isSystem: boolean;
}

export interface AuthContextSubscription {
  id: string;
  state: SubscriptionState;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
  cancelAtPeriodEnd: boolean;
  endedAt: Date | null;
  plan: {
    id: string;
    key: PlanKey;
    name: string;
    description: string | null;
    priceCents: number;
    currency: string;
    interval: PlanInterval;
    trialDays: number;
    limits: PlanLimits;
  };
}

export interface AuthContext {
  user: AuthContextUser;
  organization: AuthContextOrganization | null;
  membership: AuthContextMembership | null;
  role: AuthContextRole | null;
  permissions: PermissionKey[];
  modules: string[];
  subscription: AuthContextSubscription | null;
  session: { id: string; expiresAt: Date };
}

async function loadAuthContext(): Promise<AuthContext | null> {
  const token = await readSessionCookie();
  if (!token) {
    return null;
  }

  const session = await findSessionByTokenHash(hashSessionToken(token));
  if (!session) {
    return null;
  }
  if (session.expiresAt.getTime() <= Date.now()) {
    await deleteSessionById(session.id);
    return null;
  }

  const user = session.user;
  if (user.status !== "ACTIVE") {
    return null;
  }

  const base: AuthContext = {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    organization: null,
    membership: null,
    role: null,
    permissions: [],
    modules: [],
    subscription: null,
    session: { id: session.id, expiresAt: session.expiresAt },
  };

  let membership = session.organizationId
    ? await findActiveMembership(user.id, session.organizationId)
    : null;

  if (!membership) {
    const memberships = await listActiveMemberships(user.id);
    membership = memberships[0] ?? null;
    if (membership && membership.organizationId !== session.organizationId) {
      await setSessionOrganization(session.id, membership.organizationId);
    }
  }

  if (!membership) {
    return base;
  }

  const activeMembership = membership;
  const resolved = await withTenant(
    activeMembership.organizationId,
    async () => {
      const organization = await db.organization.findUnique({
        where: { id: activeMembership.organizationId },
      });
      if (!organization) {
        return null;
      }
      if (
        organization.status !== "ACTIVE" &&
        !isSuperAdmin(activeMembership.role.key)
      ) {
        return null;
      }

      const [subscription, organizationModules, allModules] =
        await Promise.all([
          db.subscription.findFirst({
            orderBy: { createdAt: "desc" },
            include: { plan: true },
          }),
          db.organizationModule.findMany(),
          db.module.findMany(),
        ]);

      const enabledModuleKeys = new Set(
        organizationModules
          .filter((organizationModule) => organizationModule.enabled)
          .map((organizationModule) => organizationModule.moduleId),
      );
      const modules = allModules
        .filter(
          (module) => module.isCore || enabledModuleKeys.has(module.id),
        )
        .map((module) => module.key);

      const role = activeMembership.role;
      const permissions = isSuperAdmin(role.key)
        ? [...ALL_PERMISSION_KEYS]
        : withTemplatePermissionExtras(
            role.rolePermissions.map(
              (rolePermission) => rolePermission.permission.key,
            ) as PermissionKey[],
            getTemplatePermissionExtras(organization.templateKey, role.key),
          );

      return {
        organization: {
          id: organization.id,
          slug: organization.slug,
          name: organization.name,
          logo: organization.logo,
          favicon: organization.favicon,
          primaryColor: organization.primaryColor,
          secondaryColor: organization.secondaryColor,
          businessType: organization.businessType,
          timezone: organization.timezone,
          currency: organization.currency,
          dateFormat: organization.dateFormat,
          status: organization.status,
          templateKey: organization.templateKey,
        },
        membership: {
          id: activeMembership.id,
          roleId: activeMembership.roleId,
          status: activeMembership.status,
          joinedAt: activeMembership.joinedAt,
        },
        role: {
          id: role.id,
          key: role.key,
          name: role.name || role.key,
          isSystem: role.isSystem,
        },
        permissions,
        modules,
        subscription: subscription
          ? {
              id: subscription.id,
              state: subscription.state,
              currentPeriodStart: subscription.currentPeriodStart,
              currentPeriodEnd: subscription.currentPeriodEnd,
              trialEndsAt: subscription.trialEndsAt,
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
              endedAt: subscription.endedAt,
              plan: {
                id: subscription.plan.id,
                key: subscription.plan.key,
                name: subscription.plan.name,
                description: subscription.plan.description,
                priceCents: subscription.plan.priceCents,
                currency: subscription.plan.currency,
                interval: subscription.plan.interval,
                trialDays: subscription.plan.trialDays,
                limits: parsePlanLimits(subscription.plan.limits),
              },
            }
          : null,
      };
    },
  );

  if (!resolved) {
    return base;
  }

  return { ...base, ...resolved };
}

export const getAuthContext = cache(loadAuthContext);
