import type { UsageMetric } from "@prisma/client";

import { db, orgScope } from "@/server/db";

import type { BillingContext, LimitKey, UsageSnapshot } from "./types";
import { checkSubscription } from "./subscription";

export const LIMIT_TO_METRIC: Record<LimitKey, UsageMetric> = {
  maxUsers: "USERS",
  maxLeads: "LEADS",
  maxCustomers: "CUSTOMERS",
  maxProjects: "PROJECTS",
  maxStorage: "STORAGE",
};

export const METRIC_TO_LIMIT: Record<UsageMetric, LimitKey> = {
  USERS: "maxUsers",
  LEADS: "maxLeads",
  CUSTOMERS: "maxCustomers",
  PROJECTS: "maxProjects",
  STORAGE: "maxStorage",
};

const USAGE_ORDER: LimitKey[] = [
  "maxUsers",
  "maxLeads",
  "maxCustomers",
  "maxProjects",
  "maxStorage",
];

export function monthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function monthEnd(now = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
}

export async function readUsageQuantity(
  ctx: BillingContext,
  metric: UsageMetric,
): Promise<number> {
  const row = await orgScope(ctx, () =>
    db.usage.findFirst({
      where: { metric, periodStart: monthStart() },
    }),
  );
  return row ? Number(row.quantity) : 0;
}

async function liveCount(
  ctx: BillingContext,
  metric: UsageMetric,
): Promise<number> {
  switch (metric) {
    case "USERS":
      return orgScope(ctx, () =>
        db.organizationMember.count({ where: { status: "ACTIVE" } }),
      );
    case "LEADS":
      return orgScope(ctx, () => db.crmLead.count());
    case "CUSTOMERS":
      return orgScope(ctx, () => db.crmCustomer.count());
    default:
      return readUsageQuantity(ctx, metric);
  }
}

export async function countMetric(
  ctx: BillingContext,
  limitKey: LimitKey,
): Promise<number> {
  return liveCount(ctx, LIMIT_TO_METRIC[limitKey]);
}

export async function syncUsage(
  ctx: BillingContext,
  metric: UsageMetric,
  quantity?: number,
): Promise<void> {
  const value = quantity ?? (await liveCount(ctx, metric));
  const now = new Date();
  const subscription = await orgScope(ctx, () =>
    db.subscription.findFirst({ select: { id: true } }),
  );
  await orgScope(ctx, () =>
    db.usage.upsert({
      where: {
        organizationId_metric_periodStart: {
          organizationId: ctx.organization.id,
          metric,
          periodStart: monthStart(now),
        },
      },
      update: {
        quantity: value,
        periodEnd: monthEnd(now),
        subscriptionId: subscription?.id ?? null,
      },
      create: {
        organizationId: ctx.organization.id,
        metric,
        quantity: value,
        periodStart: monthStart(now),
        periodEnd: monthEnd(now),
        subscriptionId: subscription?.id ?? null,
      },
    }),
  );
}

export async function getUsageSnapshots(
  ctx: BillingContext,
): Promise<UsageSnapshot[]> {
  const check = await checkSubscription(ctx);
  const limits = check.subscription?.plan.limits ?? null;
  const snapshots: UsageSnapshot[] = [];
  for (const limitKey of USAGE_ORDER) {
    const metric = LIMIT_TO_METRIC[limitKey];
    const used = await liveCount(ctx, metric);
    if (
      metric === "USERS" ||
      metric === "LEADS" ||
      metric === "CUSTOMERS"
    ) {
      await syncUsage(ctx, metric, used);
    }
    snapshots.push({
      metric,
      used,
      limit: limits ? limits[limitKey] : null,
    });
  }
  return snapshots;
}
