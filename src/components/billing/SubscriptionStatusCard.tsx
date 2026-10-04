import { getTranslations } from "next-intl/server";

import ComponentCard from "@/components/common/ComponentCard";
import type { SubscriptionInfo } from "@/server/billing/types";

import StateBadge from "./StateBadge";

function formatDate(date: Date | null): string {
  if (!date) {
    return "—";
  }
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-3 last:border-b-0 dark:border-white/5">
      <span className="text-theme-sm text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <span className="text-end text-theme-sm font-medium text-gray-800 dark:text-white/90">
        {value}
      </span>
    </div>
  );
}

export default async function SubscriptionStatusCard({
  subscription,
}: {
  subscription: SubscriptionInfo | null;
}) {
  const t = await getTranslations("billing");
  return (
    <ComponentCard title={t("status.title")}>
      {subscription ? (
        <div>
          <div className="mb-2 flex items-center justify-between gap-4">
            <span className="text-title-md font-semibold text-gray-900 dark:text-white">
              {subscription.plan.name}
            </span>
            <StateBadge state={subscription.state} />
          </div>
          <div>
            {subscription.state === "TRIAL" && (
              <Row
                label={t("status.trialEndsAt")}
                value={formatDate(subscription.trialEndsAt)}
              />
            )}
            <Row
              label={t("status.currentPeriodEnd")}
              value={formatDate(subscription.currentPeriodEnd)}
            />
            {subscription.cancelAtPeriodEnd && (
              <Row
                label={t("status.cancelAtPeriodEnd")}
                value={formatDate(subscription.currentPeriodEnd)}
              />
            )}
          </div>
        </div>
      ) : (
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          {t("status.none")}
        </p>
      )}
    </ComponentCard>
  );
}
