import { getRecentTaskRows } from "@/server/services/dashboard";
import Badge from "@/components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTemplateTerm } from "@/config/industry";
import { getTranslations } from "next-intl/server";

import WidgetEmptyState from "./WidgetEmptyState";
import WidgetPanel from "./WidgetPanel";
import type { DashboardWidgetProps } from "./widget-registry-types";

const statusColors = {
  open: "info",
  progress: "warning",
  blocked: "error",
  done: "success",
  canceled: "light",
} as const;

export default async function RecentTasksWidget({
  organizationId,
  templateKey,
}: DashboardWidgetProps) {
  const t = await getTranslations("dashboard.widgets.recentTasks");
  const rows = await getRecentTaskRows(organizationId);
  const title = getTemplateTerm(templateKey, "recent-tasks") ?? t("title");

  if (rows.length === 0) {
    return (
      <WidgetPanel title={title} desc={t("desc")}>
        <WidgetEmptyState />
      </WidgetPanel>
    );
  }

  return (
    <WidgetPanel title={title} desc={t("desc")}>
      <Table>
        <TableHeader className="border-y border-gray-100 dark:border-gray-800">
          <TableRow>
            <TableCell
              isHeader
              className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
            >
              {t("task")}
            </TableCell>
            <TableCell
              isHeader
              className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
            >
              {t("project")}
            </TableCell>
            <TableCell
              isHeader
              className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
            >
              {t("due")}
            </TableCell>
            <TableCell
              isHeader
              className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
            >
              {t("status")}
            </TableCell>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                {row.task}
              </TableCell>
              <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                {row.project}
              </TableCell>
              <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                {row.due}
              </TableCell>
              <TableCell className="py-3">
                <Badge size="sm" color={statusColors[row.status]}>
                  {t(`statuses.${row.status}`)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </WidgetPanel>
  );
}
