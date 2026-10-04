import { getSaasMetrics } from "@/server/services/dashboard";
import MetricCard from "@/components/dashboard/MetricCard";
import type { MetricKey } from "@/components/dashboard/types";
import {
  BoltIcon,
  CheckLineIcon,
  DollarLineIcon,
  GroupIcon,
  PaperPlaneIcon,
  PlusIcon,
  TaskIcon,
} from "@/icons";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import type { DashboardWidgetProps } from "./widget-registry-types";

const metricIcons: Record<MetricKey, ReactNode> = {
  totalLeads: <PaperPlaneIcon className="size-6" />,
  newLeads: <PlusIcon className="size-6" />,
  customers: <GroupIcon className="size-6" />,
  activeDeals: <CheckLineIcon className="size-6" />,
  revenue: <DollarLineIcon className="size-6" />,
  pendingTasks: <TaskIcon className="size-6" />,
  conversionRate: <BoltIcon className="size-6" />,
};

export default async function MetricsWidget({
  organizationId,
  currency,
}: DashboardWidgetProps) {
  const t = await getTranslations("dashboard");
  const metrics = await getSaasMetrics(organizationId, currency);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
      {metrics.map((metric) => (
        <MetricCard
          key={metric.key}
          label={t(`metrics.${metric.key}`)}
          value={metric.value}
          icon={metricIcons[metric.key]}
          delta={metric.delta}
          trend={metric.trend}
        />
      ))}
    </div>
  );
}
