import type { SubscriptionState } from "@prisma/client";

import { db, orgScope } from "@/server/db";

import { BILLING_ERRORS, BillingError } from "./errors";
import {
  parsePlanLimits,
  type BillingContext,
  type SubscriptionAccess,
  type SubscriptionCheck,
  type SubscriptionInfo,
} from "./types";

function deriveState(
  subscription: {
    state: SubscriptionState;
    trialEndsAt: Date | null;
    currentPeriodEnd: Date | null;
  },
  now: Date,
): SubscriptionState {
  if (
    subscription.state === "TRIAL" &&
    subscription.trialEndsAt &&
    subscription.trialEndsAt <= now
  ) {
    return "EXPIRED";
  }
  if (
    subscription.state === "ACTIVE" &&
    subscription.currentPeriodEnd &&
    subscription.currentPeriodEnd <= now
  ) {
    return "PAST_DUE";
  }
  if (
    subscription.state === "CANCELLED" &&
    (!subscription.currentPeriodEnd || subscription.currentPeriodEnd <= now)
  ) {
    return "EXPIRED";
  }
  return subscription.state;
}

function accessFor(state: SubscriptionState): SubscriptionAccess {
  if (state === "TRIAL" || state === "ACTIVE" || state === "CANCELLED") {
    return "full";
  }
  if (state === "PAST_DUE") {
    return "readonly";
  }
  return "none";
}

function accessErrorKey(state: SubscriptionState): string {
  if (state === "PAST_DUE") {
    return BILLING_ERRORS.subscriptionReadOnly;
  }
  if (state === "SUSPENDED") {
    return BILLING_ERRORS.subscriptionSuspended;
  }
  return BILLING_ERRORS.subscriptionExpired;
}

export async function loadSubscription(
  ctx: BillingContext,
): Promise<SubscriptionInfo | null> {
  if (ctx.subscription !== undefined && ctx.subscription !== null) {
    return ctx.subscription;
  }
  const subscription = await orgScope(ctx, () =>
    db.subscription.findUnique({
      where: { organizationId: ctx.organization.id },
      include: { plan: true },
    }),
  );
  if (!subscription) {
    return null;
  }
  return {
    id: subscription.id,
    state: subscription.state,
    trialEndsAt: subscription.trialEndsAt,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
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
  };
}

export async function checkSubscription(
  ctx: BillingContext,
  options?: { persistTransitions?: boolean },
): Promise<SubscriptionCheck> {
  const subscription = await loadSubscription(ctx);
  const isSuperAdmin = ctx.role?.key === "super_admin";
  if (!subscription) {
    return isSuperAdmin
      ? { access: "full", subscription: null, errorKey: null }
      : {
          access: "none",
          subscription: null,
          errorKey: BILLING_ERRORS.subscriptionMissing,
        };
  }
  if (isSuperAdmin) {
    return { access: "full", subscription, errorKey: null };
  }
  const now = new Date();
  const nextState = deriveState(subscription, now);
  if (nextState !== subscription.state) {
    if (options?.persistTransitions !== false) {
      await orgScope(ctx, async () => {
        await db.subscription.update({
          where: { id: subscription.id },
          data: {
            state: nextState,
            ...(nextState === "EXPIRED" ? { endedAt: now } : {}),
          },
        });
        await db.subscriptionEvent.create({
          data: {
            organizationId: ctx.organization.id,
            subscriptionId: subscription.id,
            type: "STATE_CHANGED",
            fromState: subscription.state,
            toState: nextState,
            planKey: subscription.plan.key,
          },
        });
      });
    }
    subscription.state = nextState;
    if (nextState === "EXPIRED") {
      subscription.endedAt = now;
    }
  }
  const access = accessFor(nextState);
  return {
    access,
    subscription,
    errorKey: access === "full" ? null : accessErrorKey(nextState),
  };
}

export function planCoversModule(
  check: SubscriptionCheck,
  moduleKey: string,
): boolean {
  const limits = check.subscription?.plan.limits;
  if (!limits) {
    return false;
  }
  if (!limits.enabledModules) {
    return true;
  }
  return limits.enabledModules.includes(moduleKey);
}

export async function hasModuleAccess(
  ctx: BillingContext,
  moduleKey: string,
): Promise<boolean> {
  if (ctx.role?.key === "super_admin") {
    return true;
  }
  const check = await checkSubscription(ctx);
  if (check.access === "none") {
    return false;
  }
  if (!planCoversModule(check, moduleKey)) {
    return false;
  }
  if (ctx.modules && !ctx.modules.includes(moduleKey)) {
    return false;
  }
  return true;
}

export async function requireWriteAccess(
  ctx: BillingContext,
  moduleKey?: string,
): Promise<void> {
  if (ctx.role?.key === "super_admin") {
    return;
  }
  const check = await checkSubscription(ctx);
  if (check.access === "none") {
    throw new BillingError(
      check.errorKey ?? BILLING_ERRORS.subscriptionMissing,
    );
  }
  if (check.access === "readonly") {
    throw new BillingError(BILLING_ERRORS.subscriptionReadOnly);
  }
  if (moduleKey && !planCoversModule(check, moduleKey)) {
    throw new BillingError(BILLING_ERRORS.moduleNotInPlan);
  }
}
