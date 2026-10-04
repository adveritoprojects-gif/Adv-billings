"use server";

import { PlanKey, type SubscriptionState } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { BILLING_ERRORS } from "@/server/billing/errors";
import { requireOrganization } from "@/server/auth/guards";
import { hasPermission, PERMISSIONS } from "@/server/auth/permissions";
import { db, orgScope } from "@/server/db";

export interface BillingActionResult {
  ok: boolean;
  errorKey?: string;
}

function nextPeriodEnd(interval: string, from: Date): Date {
  const end = new Date(from);
  if (interval === "YEAR") {
    end.setUTCFullYear(end.getUTCFullYear() + 1);
  } else {
    end.setUTCMonth(end.getUTCMonth() + 1);
  }
  return end;
}

export async function selectPlan(
  formData: FormData,
): Promise<BillingActionResult> {
  try {
    const ctx = await requireOrganization();
    if (
      ctx.role.key !== "super_admin" &&
      !hasPermission(ctx.role.key, ctx.permissions, PERMISSIONS.BILLING_MANAGE)
    ) {
      return { ok: false, errorKey: BILLING_ERRORS.forbidden };
    }
    const raw = formData.get("planKey");
    const planKey = typeof raw === "string" ? raw : "";
    if (!Object.values(PlanKey).includes(planKey as PlanKey)) {
      return { ok: false, errorKey: BILLING_ERRORS.planUnavailable };
    }
    const plan = await db.plan.findFirst({
      where: { key: planKey as PlanKey, isActive: true },
    });
    if (!plan) {
      return { ok: false, errorKey: BILLING_ERRORS.planUnavailable };
    }
    const now = new Date();
    const trialEndsAt =
      plan.trialDays > 0
        ? new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)
        : null;
    await orgScope(ctx, async () => {
      const existing = await db.subscription.findUnique({
        where: { organizationId: ctx.organization.id },
        include: { plan: true },
      });
      if (existing) {
        const nextState: SubscriptionState =
          existing.state === "SUSPENDED"
            ? "SUSPENDED"
            : plan.trialDays > 0
              ? "TRIAL"
              : "ACTIVE";
        const updated = await db.subscription.update({
          where: { id: existing.id },
          data: {
            planId: plan.id,
            state: nextState,
            currentPeriodStart: now,
            currentPeriodEnd:
              nextState === "TRIAL"
                ? trialEndsAt
                : nextPeriodEnd(plan.interval, now),
            trialEndsAt: nextState === "TRIAL" ? trialEndsAt : null,
            cancelAtPeriodEnd: false,
            endedAt: null,
          },
        });
        await db.subscriptionEvent.create({
          data: {
            organizationId: ctx.organization.id,
            subscriptionId: updated.id,
            type: "PLAN_CHANGED",
            fromState: existing.state,
            toState: nextState,
            planKey: plan.key,
            actorId: ctx.user.id,
            metadata: { previousPlanKey: String(existing.plan.key) },
          },
        });
      } else {
        const nextState: SubscriptionState =
          plan.trialDays > 0 ? "TRIAL" : "ACTIVE";
        const created = await db.subscription.create({
          data: {
            organizationId: ctx.organization.id,
            planId: plan.id,
            state: nextState,
            currentPeriodStart: now,
            currentPeriodEnd:
              nextState === "TRIAL"
                ? trialEndsAt
                : nextPeriodEnd(plan.interval, now),
            trialEndsAt: nextState === "TRIAL" ? trialEndsAt : null,
          },
        });
        await db.subscriptionEvent.create({
          data: {
            organizationId: ctx.organization.id,
            subscriptionId: created.id,
            type: "CREATED",
            toState: nextState,
            planKey: plan.key,
            actorId: ctx.user.id,
          },
        });
      }
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    console.error("selectPlan failed:", error);
    return { ok: false, errorKey: BILLING_ERRORS.generic };
  }
}
