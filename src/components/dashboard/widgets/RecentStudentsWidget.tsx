import { getTemplateTerm } from "@/config/industry";
import { getTranslations } from "next-intl/server";

import WidgetEmptyState from "./WidgetEmptyState";
import WidgetPanel from "./WidgetPanel";
import type { DashboardWidgetProps } from "./widget-registry-types";

export default async function RecentStudentsWidget({
  templateKey,
}: DashboardWidgetProps) {
  const t = await getTranslations("dashboard.widgets.recentStudents");
  const title = getTemplateTerm(templateKey, "recent-students") ?? t("title");

  return (
    <WidgetPanel title={title} desc={t("desc")}>
      <WidgetEmptyState />
    </WidgetPanel>
  );
}
