import { getTemplateTerm } from "@/config/industry";
import { getTranslations } from "next-intl/server";

import WidgetEmptyState from "./WidgetEmptyState";
import WidgetPanel from "./WidgetPanel";
import type { DashboardWidgetProps } from "./widget-registry-types";

export default async function TopProductsWidget({
  templateKey,
}: DashboardWidgetProps) {
  const t = await getTranslations("dashboard.widgets.topProducts");
  const title = getTemplateTerm(templateKey, "top-products") ?? t("title");

  return (
    <WidgetPanel title={title} desc={t("desc")}>
      <WidgetEmptyState />
    </WidgetPanel>
  );
}
