import { getLocale, getTranslations } from "next-intl/server";

import PlanCards, {
  type PlanCardData,
} from "@/components/billing/PlanCards";
import SubscriptionHistory from "@/components/billing/SubscriptionHistory";
import SubscriptionStatusCard from "@/components/billing/SubscriptionStatusCard";
import UpgradePrompt, {
  type UpgradePromptReason,
} from "@/components/billing/UpgradePrompt";
import UsageSection from "@/components/billing/UsageSection";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { redirect } from "@/i18n/navigation";
import { BILLING_ERRORS } from "@/server/billing/errors";
import { checkSubscription } from "@/server/billing/subscription";
import {
  parsePlanLimits,
  type SubscriptionEventInfo,
} from "@/server/billing/types";
import { getUsageSnapshots } from "@/server/billing/usage";
import { requirePageAuth } from "@/server/auth/guards";
import { hasPermission, PERMISSIONS } from "@/server/auth/permissions";
import { db, orgScope } from "@/server/db";

const ERROR_REASON: Record<string, UpgradePromptReason> = {
  [BILLING_ERRORS.subscriptionMissing]: "subscription",
  [BILLING_ERRORS.subscriptionExpired]: "expired",
  [BILLING_ERRORS.subscriptionSuspended]: "suspended",
  [BILLING_ERRORS.subscriptionReadOnly]: "readonly",
};

interface BillingPageProps {
  searchParams: Promise<{ reason?: string }>;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const ctx = await requirePageAuth();
  if (
    !hasPermission(ctx.role.key, ctx.permissions, PERMISSIONS.SUBSCRIPTION_READ)
  ) {
    const locale = await getLocale();
    redirect({ href: "/no-access", locale });
  }
  const params = await searchParams;
  const [check, snapshots, planRows, eventRows] = await Promise.all([
    checkSubscription(ctx, { persistTransitions: false }),
    getUsageSnapshots(ctx),
    db.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    orgScope(ctx, () =>
      db.subscriptionEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ),
  ]);
  const t = await getTranslations("billing");
  const canManage = hasPermission(
    ctx.role.key,
    ctx.permissions,
    PERMISSIONS.BILLING_MANAGE,
  );
  const reasonParam =
    typeof params.reason === "string" ? params.reason : null;
  const promptReason: UpgradePromptReason | null =
    (check.errorKey ? ERROR_REASON[check.errorKey] : null) ??
    (reasonParam === "module" ? "module" : null);
  const plans: PlanCardData[] = planRows.map((plan) => ({
    key: plan.key,
    name: plan.name,
    description: plan.description,
    priceCents: plan.priceCents,
    currency: plan.currency,
    interval: plan.interval,
    trialDays: plan.trialDays,
    limits: parsePlanLimits(plan.limits),
  }));
  const events: SubscriptionEventInfo[] = eventRows.map((event) => ({
    id: event.id,
    type: event.type,
    fromState: event.fromState,
    toState: event.toState,
    planKey: event.planKey,
    createdAt: event.createdAt,
  }));

  return (
    <>
      <PageBreadcrumb pageTitle={t("title")} />
      <p className="-mt-4 mb-6 text-theme-sm text-gray-500 dark:text-gray-400">
        {t("description")}
      </p>
      <div className="space-y-6">
        {promptReason && <UpgradePrompt reason={promptReason} />}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SubscriptionStatusCard subscription={check.subscription} />
          <UsageSection snapshots={snapshots} />
        </div>
        <div id="plans">
          <PlanCards
            plans={plans}
            currentPlanKey={check.subscription?.plan.key ?? null}
            canManage={canManage}
          />
        </div>
        <SubscriptionHistory events={events} />
      </div>
    </>
  );
}
