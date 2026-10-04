"use client";

import { stateBadgeColor, stateLabelKey } from "@/components/billing/states";
import { formatPlanPrice } from "@/components/billing/format";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import ComponentCard from "@/components/common/ComponentCard";
import {
  assignPlanAction,
  extendTrialAction,
  reactivateSubscriptionAction,
  startTrialAction,
  suspendSubscriptionAction,
} from "@/server/actions/super-admin";
import type { OrganizationDetailSubscription } from "@/server/services/super-admin";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

export interface PlanOption {
  key: string;
  name: string;
  priceCents: number;
  currency: string;
  interval: string;
}

interface OrgSubscriptionCardProps {
  organizationId: string;
  subscription: OrganizationDetailSubscription | null;
  plans: PlanOption[];
}

const OrgSubscriptionCard: React.FC<OrgSubscriptionCardProps> = ({
  organizationId,
  subscription,
  plans,
}) => {
  const t = useTranslations();
  const tSa = useTranslations("superAdmin");
  const tBilling = useTranslations("billing");
  const [isPending, startTransition] = useTransition();
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [planKey, setPlanKey] = useState(
    subscription?.planKey ?? plans[0]?.key ?? "",
  );
  const [days, setDays] = useState("14");

  const run = (action: () => Promise<{ ok: boolean; errorKey?: string }>) => {
    setErrorKey(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok && result.errorKey) {
        setErrorKey(result.errorKey);
      }
    });
  };

  const infoRows: Array<{ label: string; value: React.ReactNode }> = [];
  if (subscription) {
    infoRows.push({
      label: tSa("detail.subscription.plan"),
      value: formatPlanPrice(subscription.priceCents, subscription.currency)
        ? `${subscription.planName} · ${formatPlanPrice(
            subscription.priceCents,
            subscription.currency,
          )}`
        : subscription.planName,
    });
    infoRows.push({
      label: tSa("detail.subscription.state"),
      value: (
        <Badge color={stateBadgeColor(subscription.state)} size="sm">
          {tBilling(stateLabelKey(subscription.state))}
        </Badge>
      ),
    });
    if (subscription.currentPeriodStart && subscription.currentPeriodEnd) {
      infoRows.push({
        label: tSa("detail.subscription.currentPeriod"),
        value: `${new Date(
          subscription.currentPeriodStart,
        ).toLocaleDateString()} – ${new Date(
          subscription.currentPeriodEnd,
        ).toLocaleDateString()}`,
      });
    }
    if (subscription.trialEndsAt) {
      infoRows.push({
        label: tSa("detail.subscription.trialEnds"),
        value: new Date(subscription.trialEndsAt).toLocaleDateString(),
      });
    }
    if (subscription.cancelAtPeriodEnd) {
      infoRows.push({
        label: tSa("detail.subscription.cancelAtPeriodEnd"),
        value: "✓",
      });
    }
  }

  return (
    <ComponentCard title={tSa("detail.subscription.title")}>
      {errorKey ? (
        <div className="rounded-lg border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
          {t(errorKey)}
        </div>
      ) : null}

      {subscription ? (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {infoRows.map((row) => (
            <div key={row.label}>
              <dt className="text-theme-xs text-gray-400">{row.label}</dt>
              <dd className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {tSa("detail.subscription.none")}
        </p>
      )}

      <div className="space-y-4 border-t border-gray-100 pt-5 dark:border-gray-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label
              htmlFor="sa-plan-select"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
            >
              {tSa("detail.subscription.plan")}
            </label>
            <select
              id="sa-plan-select"
              value={planKey}
              onChange={(event) => setPlanKey(event.target.value)}
              className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
            >
              {plans.map((plan) => (
                <option
                  key={plan.key}
                  value={plan.key}
                  className="text-gray-700 dark:bg-gray-900"
                >
                  {plan.name}
                  {formatPlanPrice(plan.priceCents, plan.currency)
                    ? ` — ${formatPlanPrice(plan.priceCents, plan.currency)}`
                    : ""}
                </option>
              ))}
            </select>
          </div>
          <Button
            size="md"
            onClick={() => run(() => assignPlanAction(organizationId, planKey))}
            disabled={isPending || !planKey}
          >
            {tSa("detail.subscription.assignAction")}
          </Button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-40">
            <label
              htmlFor="sa-trial-days"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
            >
              {tSa("detail.subscription.days")}
            </label>
            <input
              id="sa-trial-days"
              type="number"
              min={1}
              max={90}
              value={days}
              onChange={(event) => setDays(event.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
            />
          </div>
          <Button
            size="md"
            variant="outline"
            onClick={() =>
              run(() => startTrialAction(organizationId, Number(days)))
            }
            disabled={isPending || !subscription}
          >
            {tSa("detail.subscription.startTrial")}
          </Button>
          <Button
            size="md"
            variant="outline"
            onClick={() =>
              run(() => extendTrialAction(organizationId, Number(days)))
            }
            disabled={isPending || !subscription}
          >
            {tSa("detail.subscription.extendTrial")}
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          {subscription && subscription.state !== "SUSPENDED" ? (
            <Button
              size="sm"
              variant="danger"
              onClick={() => run(() => suspendSubscriptionAction(organizationId))}
              disabled={isPending}
            >
              {tSa("detail.subscription.suspend")}
            </Button>
          ) : null}
          {subscription && subscription.state === "SUSPENDED" ? (
            <Button
              size="sm"
              variant="primary"
              onClick={() =>
                run(() => reactivateSubscriptionAction(organizationId))
              }
              disabled={isPending}
            >
              {tSa("detail.subscription.reactivate")}
            </Button>
          ) : null}
        </div>
      </div>
    </ComponentCard>
  );
};

export default OrgSubscriptionCard;
