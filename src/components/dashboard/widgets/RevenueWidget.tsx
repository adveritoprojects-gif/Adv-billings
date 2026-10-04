import RevenueChart from "@/components/dashboard/RevenueChart";
import { getRevenueSeries } from "@/server/services/dashboard";

import type { DashboardWidgetProps } from "./widget-registry-types";

export default async function RevenueWidget({
  organizationId,
  currency,
  primaryColor,
  secondaryColor,
}: DashboardWidgetProps) {
  const revenue = await getRevenueSeries(organizationId);

  return (
    <RevenueChart
      thisYear={revenue.thisYear}
      lastYear={revenue.lastYear}
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
      currency={currency}
    />
  );
}
