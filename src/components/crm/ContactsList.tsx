"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import ComponentCard from "@/components/common/ComponentCard";
import CrmDeleteDialog from "@/components/crm/CrmDeleteDialog";
import CrmEmptyState from "@/components/crm/CrmEmptyState";
import CrmFormModal, { type CrmFormField } from "@/components/crm/CrmFormModal";
import CrmPagination from "@/components/crm/CrmPagination";
import CrmSortHeader from "@/components/crm/CrmSortHeader";
import CrmToolbar, { type CrmFilter } from "@/components/crm/CrmToolbar";
import CrmUserCell from "@/components/crm/CrmUserCell";
import { formatDate } from "@/components/crm/format";
import {
  type CrmContactRow,
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
import { PencilIcon, PlusIcon, TrashBinIcon } from "@/icons";
import {
  createContact,
  deleteContact,
  updateContact,
} from "@/server/actions/crm";

const cellClasses =
  "px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400";
const headerClasses =
  "px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400";

interface ContactsListProps {
  rows: CrmContactRow[];
  total: number;
  page: number;
  totalPages: number;
  query: CrmListQuery;
  members: CrmMember[];
  companies: { id: string; name: string }[];
  canManage: boolean;
}

export default function ContactsList({
  rows,
  total,
  page,
  totalPages,
  query,
  members,
  companies,
  canManage,
}: ContactsListProps) {
  const t = useTranslations("crm");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CrmContactRow | null>(null);
  const [deleting, setDeleting] = useState<CrmContactRow | null>(null);

  const memberOptions = useMemo(
    () => members.map((member) => ({ value: member.id, label: member.name })),
    [members],
  );

  const companyOptions = useMemo(
    () => companies.map((company) => ({ value: company.id, label: company.name })),
    [companies],
  );

  const buildFields = (row?: CrmContactRow | null): CrmFormField[] => [
    {
      name: "name",
      label: t("common.name"),
      type: "text",
      required: true,
      defaultValue: row?.name ?? "",
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
      name: "jobTitle",
      label: t("common.jobTitle"),
      type: "text",
      defaultValue: row?.jobTitle ?? "",
    },
    {
      name: "companyId",
      label: t("common.company"),
      type: "select",
      options: [{ value: "", label: "—" }, ...companyOptions],
      defaultValue: row?.companyId ?? "",
    },
    {
      name: "assignedToId",
      label: t("common.assignee"),
      type: "select",
      options: [{ value: "", label: t("common.unassigned") }, ...memberOptions],
      defaultValue: row?.assignedToId ?? "",
    },
  ];

  const hasFilters = Boolean(query.q) || Boolean(query.assignedTo);

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("assignedTo");
    params.delete("page");
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  const filters: CrmFilter[] = [
    {
      name: "assignedTo",
      label: t("contacts.filters.owner"),
      options: memberOptions,
    },
  ];

  return (
    <>
      <ComponentCard title={t("contacts.title")}>
        <div>
          <CrmToolbar
            placeholder={t("contacts.searchPlaceholder")}
            filters={filters}
          />
          {rows.length === 0 ? (
            <CrmEmptyState
              title={
                hasFilters ? t("common.noResults") : t("contacts.emptyTitle")
              }
              description={
                hasFilters
                  ? t("common.noResultsDescription")
                  : t("contacts.emptyDescription")
              }
              action={
                hasFilters ? (
                  <Button size="sm" variant="outline" onClick={clearFilters}>
                    {t("common.clearFilters")}
                  </Button>
                ) : canManage ? (
                  <Button size="sm" onClick={() => setCreating(true)}>
                    <PlusIcon /> {t("contacts.newContact")}
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
                      <CrmSortHeader
                        label={t("common.name")}
                        field="name"
                        sort={query.sort}
                        dir={query.dir}
                      />
                      <CrmSortHeader
                        label={t("common.email")}
                        field="email"
                        sort={query.sort}
                        dir={query.dir}
                      />
                      <TableCell isHeader className={headerClasses}>
                        {t("common.phone")}
                      </TableCell>
                      <TableCell isHeader className={headerClasses}>
                        {t("common.jobTitle")}
                      </TableCell>
                      <TableCell isHeader className={headerClasses}>
                        {t("contacts.columns.company")}
                      </TableCell>
                      <TableCell isHeader className={headerClasses}>
                        {t("contacts.columns.assignee")}
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
                        <TableCell className={`${cellClasses} whitespace-nowrap font-medium text-gray-800 dark:text-white/90`}>
                          {row.name}
                        </TableCell>
                        <TableCell className={`${cellClasses} whitespace-nowrap`}>
                          {row.email ?? "—"}
                        </TableCell>
                        <TableCell className={`${cellClasses} whitespace-nowrap`}>
                          {row.phone ?? "—"}
                        </TableCell>
                        <TableCell className={`${cellClasses} whitespace-nowrap`}>
                          {row.jobTitle ?? "—"}
                        </TableCell>
                        <TableCell className={`${cellClasses} whitespace-nowrap`}>
                          {row.companyName ?? "—"}
                        </TableCell>
                        <TableCell className={`${cellClasses} whitespace-nowrap`}>
                          <CrmUserCell name={row.assignedToName} />
                        </TableCell>
                        <TableCell className={`${cellClasses} whitespace-nowrap`}>
                          {formatDate(row.createdAt)}
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
            key="contact-new"
            isOpen={creating}
            onClose={() => setCreating(false)}
            title={t("contacts.newContact")}
            fields={buildFields()}
            submitLabel={t("contacts.newContact")}
            onSubmit={createContact}
          />
          <CrmFormModal
            key={`contact-edit-${editing?.id ?? ""}`}
            isOpen={Boolean(editing)}
            onClose={() => setEditing(null)}
            title={t("contacts.editContact")}
            fields={buildFields(editing)}
            submitLabel={t("common.edit")}
            onSubmit={(formData) => {
              if (editing) {
                formData.set("id", editing.id);
              }
              return updateContact(formData);
            }}
          />
          <CrmDeleteDialog
            isOpen={Boolean(deleting)}
            onClose={() => setDeleting(null)}
            title={t("contacts.deleteTitle")}
            message={t("contacts.deleteMessage")}
            onConfirm={async () => {
              if (!deleting) {
                return { ok: false, errorKey: "crm.errors.notFound" };
              }
              return deleteContact(deleting.id);
            }}
          />
        </>
      ) : null}
    </>
  );
}
