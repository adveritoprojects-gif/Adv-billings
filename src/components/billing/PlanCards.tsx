import { getTranslations } from "next-intl/server";

import Badge from "@/components/ui/badge/Badge";
import ComponentCard from "@/components/common/ComponentCard";
import { selectPlan } from "@/server/actions/billing";
import type { PlanLimits } from "@/server/billing/types";

import { formatLimitValue, formatPlanPrice } from "./format";

async function runSelectPlan(formData: FormData): Promise<void> {
  "use server";
  await selectPlan(formData);
}

export interface PlanCardData {
  key: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  interval: string;
  trialDays: number;
  limits: PlanLimits;
}

type NumericLimitKey =
  | "maxUsers"
  | "maxLeads"
  | "maxCustomers"
  | "maxProjects"
  | "maxStorage";

const LIMIT_ROWS: Array<{
  limitKey: NumericLimitKey;
  labelKey: string;
  metric: string;
}> = [
  { limitKey: "maxUsers", labelKey: "plans.limits.users", metric: "USERS" },
  { limitKey: "maxLeads", labelKey: "plans.limits.leads", metric: "LEADS" },
  {
    limitKey: "maxCustomers",
    labelKey: "plans.limits.customers",
    metric: "CUSTOMERS",
  },
  {
    limitKey: "maxProjects",
    labelKey: "plans.limits.projects",
    metric: "PROJECTS",
  },
  {
    limitKey: "maxStorage",
    labelKey: "plans.limits.storage",
    metric: "STORAGE",
  },
];

export default async function PlanCards({
  plans,
  currentPlanKey,
  canManage,
}: {
  plans: PlanCardData[];
  currentPlanKey: string | null;
  canManage: boolean;
}) {
  const t = await getTranslations("billing");
  return (
    <ComponentCard title={t("plans.title")} desc={t("plans.description")}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {plans.map((plan) => {
          const isCurrent = plan.key === currentPlanKey;
          const price = formatPlanPrice(plan.priceCents, plan.currency);
          return (
            <div
              key={plan.key}
              className={`flex flex-col rounded-xl border p-5 ${
                isCurrent
                  ? "border-brand-500 dark:border-brand-500"
                  : "border-gray-200 dark:border-gray-800"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                  {plan.name}
                </h4>
                {isCurrent && (
                  <Badge color="primary" size="sm">
                    {t("plans.current")}
                  </Badge>
                )}
              </div>
              <p className="mt-1 min-h-10 text-theme-xs text-gray-500 dark:text-gray-400">
                {plan.description}
              </p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-title-lg font-semibold text-gray-900 dark:text-white">
                  {price || t("plans.free")}
                </span>
                {price && (
                  <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                    {plan.interval === "YEAR"
                      ? t("plans.perYear")
                      : t("plans.perMonth")}
                  </span>
                )}
              </div>
              {plan.trialDays > 0 && (
                <p className="mt-1 text-theme-xs text-brand-500">
                  {t("plans.trial", { count: plan.trialDays })}
                </p>
              )}
              <ul className="mt-4 space-y-2 border-t border-gray-100 pt-4 dark:border-white/5">
                {LIMIT_ROWS.map((row) => {
                  const value = plan.limits[row.limitKey];
                  return (
                    <li
                      key={row.limitKey}
                      className="flex items-center justify-between gap-2 text-theme-xs"
                    >
                      <span className="text-gray-500 dark:text-gray-400">
                        {t(row.labelKey)}
                      </span>
                      <span className="font-medium text-gray-800 dark:text-white/90">
                        {value === null
                          ? t("plans.unlimited")
                          : formatLimitValue(row.metric, value)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {canManage && !isCurrent && (
                <form action={runSelectPlan} className="mt-4 pt-1">
                  <input type="hidden" name="planKey" value={plan.key} />
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
                  >
                    {t("plans.switch")}
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </ComponentCard>
  );
}
