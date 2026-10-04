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
import CrmStatusBadge from "@/components/crm/CrmStatusBadge";
import CrmToolbar, { type CrmFilter } from "@/components/crm/CrmToolbar";
import CrmUserCell from "@/components/crm/CrmUserCell";
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  PRIORITIES,
  type CrmLeadRow,
  type CrmListQuery,
  type CrmMember,
} from "@/components/crm/types";
import Button from "@/components/ui/button/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EyeIcon, PencilIcon, PlusIcon, TrashBinIcon } from "@/icons";
import { formatDate } from "@/components/crm/format";
import {
  assignLead,
  createLead,
  deleteLead,
  setLeadStatus,
  updateLead,
} from "@/server/actions/crm";

const cellClasses =
  "px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400";
const headerClasses =
  "px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400";

interface LeadsListProps {
  rows: CrmLeadRow[];
  total: number;
  page: number;
  totalPages: number;
  query: CrmListQuery;
  members: CrmMember[];
  canManage: boolean;
}

export default function LeadsList({
  rows,
  total,
  page,
  totalPages,
  query,
  members,
  canManage,
}: LeadsListProps) {
  const t = useTranslations("crm");
  const tRoot = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CrmLeadRow | null>(null);
  const [deleting, setDeleting] = useState<CrmLeadRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const statusOptions = useMemo(
    () => LEAD_STATUSES.map((value) => ({ value, label: t(`leadStatus.${value}`) })),
    [t],
  );
  const priorityOptions = useMemo(
    () => PRIORITIES.map((value) => ({ value, label: t(`priority.${value}`) })),
    [t],
  );
  const sourceOptions = useMemo(
    () => LEAD_SOURCES.map((value) => ({ value, label: t(`sources.${value}`) })),
    [t],
  );
  const memberOptions = useMemo(
    () => members.map((member) => ({ value: member.id, label: member.name })),
    [members],
  );

  const buildFields = (row?: CrmLeadRow | null): CrmFormField[] => [
    {
      name: "name",
      label: t("common.name"),
      type: "text",
      required: true,
      defaultValue: row?.name ?? "",
      placeholder: t("leads.newLead"),
    },
    {
      name: "email",
      label: t("common.email"),
      type: "email",
      defaultValue: row?.email ?? "",
    },
    {
      name: "phone",
      label: t("common.phone"),
      type: "tel",
      defaultValue: row?.phone ?? "",
    },
    {
      name: "company",
      label: t("common.company"),
      type: "text",
      defaultValue: row?.company ?? "",
    },
    {
      name: "source",
      label: t("common.source"),
      type: "select",
      options: sourceOptions,
      defaultValue: row?.source ?? "WEB_FORM",
    },
    {
      name: "value",
      label: t("form.value"),
      type: "number",
      defaultValue:
        row?.valueCents != null ? String(row.valueCents / 100) : "",
    },
    {
      name: "status",
      label: t("common.status"),
      type: "select",
      options: statusOptions,
      defaultValue: row?.status ?? "NEW",
    },
    {
      name: "priority",
      label: t("common.priority"),
      type: "select",
      options: priorityOptions,
      defaultValue: row?.priority ?? "MEDIUM",
    },
    {
      name: "assignedToId",
      label: t("common.assignee"),
      type: "select",
      options: [{ value: "", label: t("common.unassigned") }, ...memberOptions],
      defaultValue: row?.assignedToId ?? "",
    },
    {
      name: "notes",
      label: t("common.notes"),
      type: "textarea",
      defaultValue: row?.notes ?? "",
    },
  ];

  const hasFilters =
    Boolean(query.q) ||
    Boolean(query.status) ||
    Boolean(query.assignedTo) ||
    Boolean(query.type);

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("status");
    params.delete("assignedTo");
    params.delete("type");
    params.delete("page");
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  const handleStatus = (id: string, status: string) => {
    setActionError(null);
    startTransition(async () => {
      const result = await setLeadStatus(id, status);
      if (result.ok) {
        setActionError(null);
        return;
      }
      setActionError(result.errorKey ?? "crm.errors.generic");
      router.refresh();
    });
  };

  const handleAssign = (id: string, assignedToId: string) => {
    setActionError(null);
    startTransition(async () => {
      const result = await assignLead(id, assignedToId || null);
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
      label: t("leads.filters.status"),
      options: statusOptions,
    },
    {
      name: "assignedTo",
      label: t("leads.filters.owner"),
      options: memberOptions,
    },
  ];

  const emptyAction = canManage
    ? (
        <Button size="sm" onClick={() => setCreating(true)}>
          <PlusIcon /> {t("leads.newLead")}
        </Button>
      )
    : undefined;

  return (
    <>
      <ComponentCard title={t("leads.title")}>
        <div>
          <CrmToolbar placeholder={t("leads.searchPlaceholder")} filters={filters} />
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
              title={hasFilters ? t("common.noResults") : t("leads.emptyTitle")}
              description={
                hasFilters
                  ? t("common.noResultsDescription")
                  : t("leads.emptyDescription")
              }
              action={
                hasFilters ? (
                  <Button size="sm" variant="outline" onClick={clearFilters}>
                    {t("common.clearFilters")}
                  </Button>
                ) : (
                  emptyAction
                )
              }
            />
          ) : (
            <>
              <div className="max-w-full overflow-x-auto">
                <Table>
                  <TableHeader className="border-b border-gray-100 dark:border-white/5">
                    <TableRow>
                      <CrmSortHeader
                        label={t("common.name")}
                        field="name"
                        sort={query.sort}
                        dir={query.dir}
                      />
                      <TableCell isHeader className={headerClasses}>
                        {t("leads.columns.contact")}
                      </TableCell>
                      <CrmSortHeader
                        label={t("common.company")}
                        field="company"
                        sort={query.sort}
                        dir={query.dir}
                      />
                      <TableCell isHeader className={headerClasses}>
                        {t("leads.columns.source")}
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
                      <TableCell isHeader className={headerClasses}>
                        {t("leads.columns.assignee")}
                      </TableCell>
                      <CrmSortHeader
                        label={t("common.created")}
                        field="createdAt"
                        sort={query.sort}
                        dir={query.dir}
                      />
                      <TableCell isHeader className={`${headerClasses} text-end`}>
                        {t("common.actions")}
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className={`${cellClasses} whitespace-nowrap`}>
                          <Link
                            href={`/crm/leads/${row.id}`}
                            className="font-medium text-gray-800 hover:text-brand-500 dark:text-white/90"
                          >
                            {row.name}
                          </Link>
                        </TableCell>
                        <TableCell className={`${cellClasses} whitespace-nowrap`}>
                          {row.email ? (
                            <span className="block">{row.email}</span>
                          ) : null}
                          {row.phone ? (
                            <span className="block text-theme-xs text-gray-400 dark:text-gray-500">
                              {row.phone}
                            </span>
                          ) : null}
                          {!row.email && !row.phone ? "—" : null}
                        </TableCell>
                        <TableCell className={`${cellClasses} whitespace-nowrap`}>
                          {row.company ?? "—"}
                        </TableCell>
                        <TableCell className={`${cellClasses} whitespace-nowrap`}>
                          {t(`sources.${row.source}`)}
                        </TableCell>
                        <TableCell className={`${cellClasses} whitespace-nowrap`}>
                          {canManage ? (
                            <CrmInlineSelect
                              value={row.status}
                              options={statusOptions}
                              onChange={(value) => handleStatus(row.id, value)}
                              ariaLabel={`${row.name}: ${t("common.status")}`}
                              disabled={isPending}
                            />
                          ) : (
                            <CrmStatusBadge entity="lead" status={row.status} />
                          )}
                        </TableCell>
                        <TableCell className={`${cellClasses} whitespace-nowrap`}>
                          <CrmPriorityBadge priority={row.priority} />
                        </TableCell>
                        <TableCell className={`${cellClasses} whitespace-nowrap`}>
                          {canManage ? (
                            <select
                              aria-label={`${row.name}: ${t("common.assignee")}`}
                              value={row.assignedToId ?? ""}
                              disabled={isPending}
                              onChange={(event) =>
                                handleAssign(row.id, event.target.value)
                              }
                              className="h-8 cursor-pointer rounded-lg border border-gray-300 bg-transparent px-2.5 py-1 text-theme-xs font-medium text-gray-700 hover:border-brand-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
                            >
                              <option value="" className="dark:bg-gray-900">
                                {t("common.unassigned")}
                              </option>
                              {memberOptions.map((option) => (
                                <option
                                  key={option.value}
                                  value={option.value}
                                  className="dark:bg-gray-900"
                                >
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <CrmUserCell name={row.assignedToName} />
                          )}
                        </TableCell>
                        <TableCell className={`${cellClasses} whitespace-nowrap`}>
                          {formatDate(row.createdAt)}
                        </TableCell>
                        <TableCell className={`${cellClasses} text-end`}>
                          <span className="inline-flex items-center gap-1">
                            <Link
                              href={`/crm/leads/${row.id}`}
                              aria-label={t("leads.viewLead")}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-200"
                            >
                              <EyeIcon />
                            </Link>
                            {canManage ? (
                              <>
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
                              </>
                            ) : null}
                          </span>
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
            key="lead-new"
            isOpen={creating}
            onClose={() => setCreating(false)}
            title={t("leads.newLead")}
            fields={buildFields()}
            submitLabel={t("leads.newLead")}
            onSubmit={createLead}
          />
          <CrmFormModal
            key={`lead-edit-${editing?.id ?? ""}`}
            isOpen={Boolean(editing)}
            onClose={() => setEditing(null)}
            title={t("leads.editLead")}
            fields={buildFields(editing)}
            submitLabel={t("common.edit")}
            onSubmit={(formData) => {
              if (editing) {
                formData.set("id", editing.id);
              }
              return updateLead(formData);
            }}
          />
          <CrmDeleteDialog
            isOpen={Boolean(deleting)}
            onClose={() => setDeleting(null)}
            title={t("leads.deleteTitle")}
            message={t("leads.deleteMessage")}
            onConfirm={async () => {
              if (!deleting) {
                return { ok: false, errorKey: "crm.errors.notFound" };
              }
              return deleteLead(deleting.id);
            }}
          />
        </>
      ) : null}
    </>
  );
}
