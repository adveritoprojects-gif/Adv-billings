import type { CrmLeadStatus } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import Badge from "../ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import WidgetEmptyState from "./widgets/WidgetEmptyState";
import type { LeadRow } from "./types";

const statusColors: Record<
  CrmLeadStatus,
  "info" | "success" | "warning" | "primary" | "error"
> = {
  NEW: "info",
  CONTACTED: "primary",
  QUALIFIED: "success",
  PROPOSAL: "warning",
  WON: "success",
  LOST: "error",
};

interface RecentLeadsProps {
  rows: LeadRow[];
}

export default async function RecentLeads({ rows }: RecentLeadsProps) {
  const t = await getTranslations("dashboard.recentLeads");
  const tStatus = await getTranslations("crm.leadStatus");

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pt-4 pb-3 sm:px-6 dark:border-gray-800 dark:bg-white/3">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("title")}
          </h3>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            {t("desc")}
          </p>
        </div>
      </div>
      {rows.length === 0 ? (
        <WidgetEmptyState />
      ) : (
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                {t("name")}
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                {t("company")}
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                {t("source")}
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                {t("status")}
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                {t("value")}
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="py-3">
                  <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                    {lead.name}
                  </p>
                </TableCell>
                <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                  {lead.company}
                </TableCell>
                <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                  {lead.source}
                </TableCell>
                <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                  <Badge size="sm" color={statusColors[lead.status]}>
                    {tStatus(lead.status)}
                  </Badge>
                </TableCell>
                <TableCell className="py-3 text-end text-theme-sm font-medium text-gray-800 dark:text-white/90">
                  {lead.value}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      )}
    </div>
  );
}
