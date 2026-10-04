import { getTranslations } from "next-intl/server";

import ComponentCard from "@/components/common/ComponentCard";
import type { UsageSnapshot } from "@/server/billing/types";

import { formatLimitValue } from "./format";

const METRIC_LABEL_KEYS: Record<string, string> = {
  USERS: "usage.users",
  LEADS: "usage.leads",
  CUSTOMERS: "usage.customers",
  PROJECTS: "usage.projects",
  STORAGE: "usage.storage",
};

function UsageBar({ percent }: { percent: number }) {
  const clamped = Math.min(percent, 100);
  const fill =
    clamped >= 90
      ? "bg-warning-500"
      : "bg-brand-500";
  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
      <div
        className={`h-full rounded-full ${fill}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export default async function UsageSection({
  snapshots,
}: {
  snapshots: UsageSnapshot[];
}) {
  const t = await getTranslations("billing");
  return (
    <ComponentCard title={t("usage.title")} desc={t("usage.description")}>
      <div className="space-y-5">
        {snapshots.map((snapshot) => {
          const label = t(METRIC_LABEL_KEYS[snapshot.metric] ?? "usage.users");
          const used = formatLimitValue(snapshot.metric, snapshot.used);
          const value =
            snapshot.limit === null
              ? t("usage.usedOnly", { used })
              : t("usage.of", {
                  used,
                  limit: formatLimitValue(snapshot.metric, snapshot.limit),
                });
          const percent =
            snapshot.limit && snapshot.limit > 0
              ? (snapshot.used / snapshot.limit) * 100
              : 0;
          return (
            <div key={snapshot.metric}>
              <div className="flex items-center justify-between gap-4">
                <span className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  {label}
                </span>
                <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                  {value}
                  {snapshot.limit === null && (
                    <span className="ms-2 font-medium text-success-600 dark:text-success-500">
                      {t("usage.unlimited")}
                    </span>
                  )}
                </span>
              </div>
              {snapshot.limit !== null && <UsageBar percent={percent} />}
            </div>
          );
        })}
      </div>
    </ComponentCard>
  );
}
