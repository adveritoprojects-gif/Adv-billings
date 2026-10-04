import RecentLeads from "@/components/dashboard/RecentLeads";
import { getRecentLeadRows } from "@/server/services/dashboard";

import type { DashboardWidgetProps } from "./widget-registry-types";

export default async function RecentLeadsWidget({
  organizationId,
  currency,
}: DashboardWidgetProps) {
  const rows = await getRecentLeadRows(organizationId, currency);
  return <RecentLeads rows={rows} />;
}
