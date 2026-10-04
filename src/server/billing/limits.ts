import { db, orgScope } from "@/server/db";

import { BILLING_ERRORS } from "./errors";
import { countMetric } from "./usage";
import { checkSubscription } from "./subscription";
import type { BillingContext, LimitKey, PlanLimitCheck } from "./types";

const LIMIT_ERROR_KEYS: Record<LimitKey, string> = {
  maxUsers: BILLING_ERRORS.userLimit,
  maxLeads: BILLING_ERRORS.leadLimit,
  maxCustomers: BILLING_ERRORS.customerLimit,
  maxProjects: BILLING_ERRORS.projectLimit,
  maxStorage: BILLING_ERRORS.storageLimit,
};

export async function checkPlanLimit(
  ctx: BillingContext,
  limitKey: LimitKey,
  additional = 0,
): Promise<PlanLimitCheck> {
  const check = await checkSubscription(ctx);
  if (check.access !== "full") {
    return {
      ok: false,
      used: 0,
      limit: null,
      errorKey: check.errorKey ?? BILLING_ERRORS.subscriptionReadOnly,
    };
  }
  const limits = check.subscription?.plan.limits;
  if (!limits) {
    return {
      ok: false,
      used: 0,
      limit: null,
      errorKey: BILLING_ERRORS.subscriptionMissing,
    };
  }
  const limit = limits[limitKey];
  const used = await countMetric(ctx, limitKey);
  if (limit !== null && used + additional > limit) {
    await orgScope(ctx, () =>
      db.subscriptionEvent.create({
        data: {
          organizationId: ctx.organization.id,
          type: "LIMIT_REACHED",
          metadata: { limitKey, limit, used },
        },
      }),
    ).catch(() => undefined);
    return { ok: false, used, limit, errorKey: LIMIT_ERROR_KEYS[limitKey] };
  }
  return { ok: true, used, limit, errorKey: null };
}

export function canAddUser(
  ctx: BillingContext,
  additional = 1,
): Promise<PlanLimitCheck> {
  return checkPlanLimit(ctx, "maxUsers", additional);
}

export function canCreateLead(ctx: BillingContext): Promise<PlanLimitCheck> {
  return checkPlanLimit(ctx, "maxLeads", 1);
}

export function canCreateCustomer(
  ctx: BillingContext,
): Promise<PlanLimitCheck> {
  return checkPlanLimit(ctx, "maxCustomers", 1);
}

export function canCreateProject(
  ctx: BillingContext,
): Promise<PlanLimitCheck> {
  return checkPlanLimit(ctx, "maxProjects", 1);
}
