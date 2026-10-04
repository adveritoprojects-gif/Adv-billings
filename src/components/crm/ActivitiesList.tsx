"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import ComponentCard from "@/components/common/ComponentCard";
import CrmEmptyState from "@/components/crm/CrmEmptyState";
import CrmPagination from "@/components/crm/CrmPagination";
import CrmSortHeader from "@/components/crm/CrmSortHeader";
import CrmToolbar, { type CrmFilter } from "@/components/crm/CrmToolbar";
import CrmUserCell from "@/components/crm/CrmUserCell";
import { formatDateTime } from "@/components/crm/format";
import {
  ACTIVITY_TYPES,
  type CrmActivityRow,
  type CrmListQuery,
} from "@/components/crm/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const cellClasses =
  "px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400";
const headerClasses =
  "px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400";

interface ActivitiesListProps {
  rows: CrmActivityRow[];
  total: number;
  page: number;
  totalPages: number;
  query: CrmListQuery;
}

export default function ActivitiesList({
  rows,
  total,
  page,
  totalPages,
  query,
}: ActivitiesListProps) {
  const t = useTranslations("crm");

  const typeOptions = useMemo(
    () =>
      ACTIVITY_TYPES.map((value) => ({
        value,
        label: t(`activityType.${value}`),
      })),
    [t],
  );

  const filters: CrmFilter[] = [
    { name: "type", label: t("activities.filters.type"), options: typeOptions },
  ];

  const relatedTo = (row: CrmActivityRow) => {
    if (row.leadId && row.leadName) {
      return (
        <Link
          href={`/crm/leads/${row.leadId}`}
          className="text-brand-500 hover:text-brand-600"
        >
          {row.leadName}
        </Link>
      );
    }
    const name =
      row.contactName ?? row.customerName ?? row.companyName ?? null;
    return name ?? "—";
  };

  return (
    <ComponentCard title={t("activities.title")}>
      <div>
        <CrmToolbar
          placeholder={t("activities.searchPlaceholder")}
          filters={filters}
        />
        {rows.length === 0 ? (
          <CrmEmptyState
            title={t("activities.emptyTitle")}
            description={t("activities.emptyDescription")}
          />
        ) : (
          <>
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/5">
                  <TableRow>
                    <CrmSortHeader
                      label={t("common.type")}
                      field="type"
                      sort={query.sort}
                      dir={query.dir}
                    />
                    <TableCell isHeader className={headerClasses}>
                      {t("common.title")}
                    </TableCell>
                    <TableCell isHeader className={headerClasses}>
                      {t("activities.columns.relatedTo")}
                    </TableCell>
                    <TableCell isHeader className={headerClasses}>
                      {t("activities.columns.actor")}
                    </TableCell>
                    <CrmSortHeader
                      label={t("activities.columns.when")}
                      field="occurredAt"
                      sort={query.sort}
                      dir={query.dir}
                    />
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className={`${cellClasses} whitespace-nowrap`}>
                        <span className="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 text-theme-xs font-medium text-gray-600 dark:bg-white/5 dark:text-gray-300">
                          {t(`activityType.${row.type}`)}
                        </span>
                      </TableCell>
                      <TableCell className={cellClasses}>
                        <span className="block font-medium text-gray-800 dark:text-white/90">
                          {row.subject}
                        </span>
                        {row.description ? (
                          <span className="mt-0.5 block max-w-72 truncate text-theme-xs text-gray-400 dark:text-gray-500">
                            {row.description}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className={`${cellClasses} whitespace-nowrap`}>
                        {relatedTo(row)}
                      </TableCell>
                      <TableCell className={`${cellClasses} whitespace-nowrap`}>
                        <CrmUserCell name={row.actorName} />
                      </TableCell>
                      <TableCell className={`${cellClasses} whitespace-nowrap`}>
                        {formatDateTime(row.occurredAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <CrmPagination page={page} totalPages={totalPages} total={total} />
          </>
        )}
      </div>
    </ComponentCard>
  );
}
