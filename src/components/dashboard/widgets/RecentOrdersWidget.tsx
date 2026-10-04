import { getTemplateTerm } from "@/config/industry";
import { getTranslations } from "next-intl/server";

import WidgetEmptyState from "./WidgetEmptyState";
import WidgetPanel from "./WidgetPanel";
import type { DashboardWidgetProps } from "./widget-registry-types";

export default async function RecentOrdersWidget({
  templateKey,
}: DashboardWidgetProps) {
  const t = await getTranslations("dashboard.widgets.recentOrders");
  const title = getTemplateTerm(templateKey, "recent-orders") ?? t("title");

  return (
    <WidgetPanel title={title} desc={t("desc")}>
      <WidgetEmptyState />
    </WidgetPanel>
  );
}
