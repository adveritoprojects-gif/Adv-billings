import { getTemplateTerm } from "@/config/industry";
import { getTranslations } from "next-intl/server";

import WidgetEmptyState from "./WidgetEmptyState";
import WidgetPanel from "./WidgetPanel";
import type { DashboardWidgetProps } from "./widget-registry-types";

export default async function LowStockWidget({
  templateKey,
}: DashboardWidgetProps) {
  const t = await getTranslations("dashboard.widgets.lowStock");
  const title = getTemplateTerm(templateKey, "low-stock") ?? t("title");

  return (
    <WidgetPanel title={title} desc={t("desc")}>
      <WidgetEmptyState />
    </WidgetPanel>
  );
}
