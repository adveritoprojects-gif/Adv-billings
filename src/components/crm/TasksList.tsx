"use client";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import ComponentCard from "@/components/common/ComponentCard";
import CrmDeleteDialog from "@/components/crm/CrmDeleteDialog";
import CrmEmptyState from "@/components/crm/CrmEmptyState";
import CrmFormModal, { type CrmFormField } from "@/components/crm/CrmFormModal";
import CrmInlineSelect from "@/components/crm/CrmInlineSelect";
import CrmPagination from "@/components/crm/CrmPagination";
import CrmPriorityBadge from "@/components/crm/CrmPriorityBadge";
import CrmSortHeader from "@/components/crm/CrmSortHeader";
import CrmToolbar, { type CrmFilter } from "@/components/crm/CrmToolbar";
import CrmUserCell from "@/components/crm/CrmUserCell";
import { formatDate, toDateTimeLocalValue } from "@/components/crm/format";
import {
  PRIORITIES,
  TASK_STATUSES,
  type CrmListQuery,
  type CrmMember,
  type CrmTaskRow,
} from "@/components/crm/types";
import Button from "@/components/ui/button/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PencilIcon, PlusIcon, TrashBinIcon } from "@/icons";
import {
  createTask,
  deleteTask,
  setTaskStatus,
  updateTask,
} from "@/server/actions/crm";

const cellClasses =
  "px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400";
const headerClasses =
  "px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400";

interface TasksListProps {
  rows: CrmTaskRow[];
  total: number;
  page: number;
  totalPages: number;
  query: CrmListQuery;
  members: CrmMember[];
  leads: { id: string; name: string }[];
  canManage: boolean;
}

export default function TasksList({
  rows,
  total,
  page,
  totalPages,
  query,
  members,
  leads,
  canManage,
}: TasksListProps) {
  const t = useTranslations("crm");
  const tRoot = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CrmTaskRow | null>(null);
  const [deleting, setDeleting] = useState<CrmTaskRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const statusOptions = useMemo(
    () => TASK_STATUSES.map((value) => ({ value, label: t(`taskStatus.${value}`) })),
    [t],
  );
  const priorityOptions = useMemo(
    () => PRIORITIES.map((value) => ({ value, label: t(`priority.${value}`) })),
    [t],
  );
  const memberOptions = useMemo(
    () => members.map((member) => ({ value: member.id, label: member.name })),
    [members],
  );
  const leadOptions = useMemo(
    () => leads.map((lead) => ({ value: lead.id, label: lead.name })),
    [leads],
  );

  const buildFields = (row?: CrmTaskRow | null): CrmFormField[] => [
    {
      name: "title",
      label: t("common.title"),
      type: "text",
      required: true,
      defaultValue: row?.title ?? "",
      full: true,
    },
    {
      name: "status",
      label: t("common.status"),
      type: "select",
      options: statusOptions,
      defaultValue: row?.status ?? "OPEN",
    },
    {
      name: "priority",
      label: t("common.priority"),
      type: "select",
      options: priorityOptions,
      defaultValue: row?.priority ?? "MEDIUM",
    },
    {
      name: "dueAt",
      label: t("common.dueAt"),
      type: "datetime-local",
      defaultValue: toDateTimeLocalValue(row?.dueAt ?? null),
    },
    {
      name: "assignedToId",
      label: t("common.assignee"),
      type: "select",
      options: [{ value: "", label: t("common.unassigned") }, ...memberOptions],
      defaultValue: row?.assignedToId ?? "",
    },
    {
      name: "leadId",
      label: t("tasks.columns.lead"),
      type: "select",
      options: [{ value: "", label: "—" }, ...leadOptions],
      defaultValue: row?.leadId ?? "",
    },
    {
      name: "description",
      label: t("common.description"),
      type: "textarea",
      defaultValue: row?.description ?? "",
    },
  ];

  const hasFilters =
    Boolean(query.q) || Boolean(query.status) || Boolean(query.assignedTo);

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("status");
    params.delete("assignedTo");
    params.delete("page");
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  const handleStatus = (id: string, status: string) => {
    setActionError(null);
    startTransition(async () => {
      const result = await setTaskStatus(id, status);
      if (result.ok) {
        setActionError(null);
        return;
      }
      setActionError(result.errorKey ?? "crm.errors.generic");
      router.refresh();
    });
  };

  const filters: CrmFilter[] = [
    {
      name: "status",
      label: t("tasks.filters.status"),
      options: statusOptions,
    },
    {
      name: "assignedTo",
      label: t("tasks.filters.owner"),
      options: memberOptions,
    },
  ];

  return (
    <>
      <ComponentCard title={t("tasks.title")}>
        <div>
          <CrmToolbar
            placeholder={t("tasks.searchPlaceholder")}
            filters={filters}
          />
          {actionError ? (
            <p
              role="alert"
              className="mb-4 rounded-lg bg-error-50 px-4 py-3 text-theme-sm text-error-500 dark:bg-error-500/15 dark:text-error-400"
            >
              {tRoot(actionError)}
            </p>
          ) : null}
          {rows.length === 0 ? (
            <CrmEmptyState
              title={hasFilters ? t("common.noResults") : t("tasks.emptyTitle")}
              description={
                hasFilters
                  ? t("common.noResultsDescription")
                  : t("tasks.emptyDescription")
              }
              action={
                hasFilters ? (
                  <Button size="sm" variant="outline" onClick={clearFilters}>
                    {t("common.clearFilters")}
                  </Button>
                ) : canManage ? (
                  <Button size="sm" onClick={() => setCreating(true)}>
                    <PlusIcon /> {t("tasks.newTask")}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="max-w-full overflow-x-auto">
                <Table>
                  <TableHeader className="border-b border-gray-100 dark:border-white/5">
                    <TableRow>
                      <TableCell isHeader className={headerClasses}>
                        {t("common.title")}
                      </TableCell>
                      <CrmSortHeader
                        label={t("common.status")}
                        field="status"
                        sort={query.sort}
                        dir={query.dir}
                      />
                      <CrmSortHeader
                        label={t("common.priority")}
                        field="priority"
                        sort={query.sort}
                        dir={query.dir}
                      />
                      <CrmSortHeader
                        label={t("tasks.columns.due")}
                        field="dueAt"
                        sort={query.sort}
                        dir={query.dir}
                      />
                      <TableCell isHeader className={headerClasses}>
                        {t("tasks.columns.assignee")}
                      </TableCell>
                      <TableCell isHeader className={headerClasses}>
                        {t("tasks.columns.lead")}
                      </TableCell>
                      <TableCell isHeader className={`${headerClasses} text-end`}>
                        {t("common.actions")}
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className={cellClasses}>
                          <span className="block font-medium text-gray-800 dark:text-white/90">
                            {row.title}
                          </span>
                          {row.description ? (
                            <span className="mt-0.5 block max-w-56 truncate text-theme-xs text-gray-400 dark:text-gray-500">
                              {row.description}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className={`${cellClasses} whitespace-nowrap`}>
                          {canManage ? (
                            <CrmInlineSelect
                              value={row.status}
                              options={statusOptions}
                              onChange={(value) => handleStatus(row.id, value)}
                              ariaLabel={`${row.title}: ${t("common.status")}`}
                              disabled={isPending}
                            />
                          ) : (
                            <span className="text-theme-xs font-medium text-gray-600 dark:text-gray-300">
                              {t(`taskStatus.${row.status}`)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className={`${cellClasses} whitespace-nowrap`}>
                          <CrmPriorityBadge priority={row.priority} />
                        </TableCell>
                        <TableCell
                          className={`${cellClasses} whitespace-nowrap ${
                            row.overdue
                              ? "font-medium text-error-500"
                              : ""
                          }`}
                        >
                          {row.dueAt ? formatDate(row.dueAt) : "—"}
                        </TableCell>
                        <TableCell className={`${cellClasses} whitespace-nowrap`}>
                          <CrmUserCell name={row.assignedToName} />
                        </TableCell>
                        <TableCell className={`${cellClasses} whitespace-nowrap`}>
                          {row.leadId && row.leadName ? (
                            <Link
                              href={`/crm/leads/${row.leadId}`}
                              className="text-brand-500 hover:text-brand-600"
                            >
                              {row.leadName}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className={`${cellClasses} text-end`}>
                          {canManage ? (
                            <span className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                aria-label={t("common.edit")}
                                onClick={() => setEditing(row)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand-500 dark:hover:bg-white/5"
                              >
                                <PencilIcon />
                              </button>
                              <button
                                type="button"
                                aria-label={t("common.delete")}
                                onClick={() => setDeleting(row)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-error-500 dark:hover:bg-white/5"
                              >
                                <TrashBinIcon />
                              </button>
                            </span>
                          ) : null}
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

      {canManage ? (
        <>
          <CrmFormModal
            key="task-new"
            isOpen={creating}
            onClose={() => setCreating(false)}
            title={t("tasks.newTask")}
            fields={buildFields()}
            submitLabel={t("tasks.newTask")}
            onSubmit={createTask}
          />
          <CrmFormModal
            key={`task-edit-${editing?.id ?? ""}`}
            isOpen={Boolean(editing)}
            onClose={() => setEditing(null)}
            title={t("tasks.editTask")}
            fields={buildFields(editing)}
            submitLabel={t("common.edit")}
            onSubmit={(formData) => {
              if (editing) {
                formData.set("id", editing.id);
              }
              return updateTask(formData);
            }}
          />
          <CrmDeleteDialog
            isOpen={Boolean(deleting)}
            onClose={() => setDeleting(null)}
            title={t("tasks.deleteTitle")}
            message={t("tasks.deleteMessage")}
            onConfirm={async () => {
              if (!deleting) {
                return { ok: false, errorKey: "crm.errors.notFound" };
              }
              return deleteTask(deleting.id);
            }}
          />
        </>
      ) : null}
    </>
  );
}
