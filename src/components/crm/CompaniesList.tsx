"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import ComponentCard from "@/components/common/ComponentCard";
import CrmDeleteDialog from "@/components/crm/CrmDeleteDialog";
import CrmEmptyState from "@/components/crm/CrmEmptyState";
import CrmFormModal, { type CrmFormField } from "@/components/crm/CrmFormModal";
import CrmPagination from "@/components/crm/CrmPagination";
import CrmSortHeader from "@/components/crm/CrmSortHeader";
import CrmToolbar from "@/components/crm/CrmToolbar";
import { formatDate } from "@/components/crm/format";
import {
  type CrmCompanyRow,
  type CrmListQuery,
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
  createCompany,
  deleteCompany,
  updateCompany,
} from "@/server/actions/crm";

const cellClasses =
  "px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400";
const headerClasses =
  "px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400";

interface CompaniesListProps {
  rows: CrmCompanyRow[];
  total: number;
  page: number;
  totalPages: number;
  query: CrmListQuery;
  canManage: boolean;
}

export default function CompaniesList({
  rows,
  total,
  page,
  totalPages,
  query,
  canManage,
}: CompaniesListProps) {
  const t = useTranslations("crm");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CrmCompanyRow | null>(null);
  const [deleting, setDeleting] = useState<CrmCompanyRow | null>(null);

  const buildFields = (row?: CrmCompanyRow | null): CrmFormField[] => [
    {
      name: "name",
      label: t("common.name"),
      type: "text",
      required: true,
      defaultValue: row?.name ?? "",
    },
    {
      name: "website",
      label: t("common.website"),
      type: "url",
      defaultValue: row?.website ?? "",
    },
    {
      name: "industry",
      label: t("common.industry"),
      type: "text",
      defaultValue: row?.industry ?? "",
    },
    {
      name: "size",
      label: t("common.size"),
      type: "text",
      defaultValue: row?.size ?? "",
      placeholder: "1-10",
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
      name: "address",
      label: t("common.address"),
      type: "textarea",
      defaultValue: row?.address ?? "",
    },
  ];

  const hasFilters = Boolean(query.q);

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("page");
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  return (
    <>
      <ComponentCard title={t("companies.title")}>
        <div>
          <CrmToolbar placeholder={t("companies.searchPlaceholder")} />
          {rows.length === 0 ? (
            <CrmEmptyState
              title={
                hasFilters ? t("common.noResults") : t("companies.emptyTitle")
              }
              description={
                hasFilters
                  ? t("common.noResultsDescription")
                  : t("companies.emptyDescription")
              }
              action={
                hasFilters ? (
                  <Button size="sm" variant="outline" onClick={clearFilters}>
                    {t("common.clearFilters")}
                  </Button>
                ) : canManage ? (
                  <Button size="sm" onClick={() => setCreating(true)}>
                    <PlusIcon /> {t("companies.newCompany")}
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
                      <TableCell isHeader className={headerClasses}>
                        {t("companies.columns.website")}
                      </TableCell>
                      <CrmSortHeader
                        label={t("common.industry")}
                        field="industry"
                        sort={query.sort}
                        dir={query.dir}
                      />
                      <TableCell isHeader className={headerClasses}>
                        {t("companies.columns.contacts")}
                      </TableCell>
                      <TableCell isHeader className={headerClasses}>
                        {t("common.size")}
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
                          {row.website ? (
                            <a
                              href={row.website}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-500 hover:text-brand-600"
                            >
                              {row.website}
                            </a>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className={`${cellClasses} whitespace-nowrap`}>
                          {row.industry ?? "—"}
                        </TableCell>
                        <TableCell className={`${cellClasses} whitespace-nowrap`}>
                          {row.contactCount}
                        </TableCell>
                        <TableCell className={`${cellClasses} whitespace-nowrap`}>
                          {row.size ?? "—"}
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
            key="company-new"
            isOpen={creating}
            onClose={() => setCreating(false)}
            title={t("companies.newCompany")}
            fields={buildFields()}
            submitLabel={t("companies.newCompany")}
            onSubmit={createCompany}
          />
          <CrmFormModal
            key={`company-edit-${editing?.id ?? ""}`}
            isOpen={Boolean(editing)}
            onClose={() => setEditing(null)}
            title={t("companies.editCompany")}
            fields={buildFields(editing)}
            submitLabel={t("common.edit")}
            onSubmit={(formData) => {
              if (editing) {
                formData.set("id", editing.id);
              }
              return updateCompany(formData);
            }}
          />
          <CrmDeleteDialog
            isOpen={Boolean(deleting)}
            onClose={() => setDeleting(null)}
            title={t("companies.deleteTitle")}
            message={t("companies.deleteMessage")}
            onConfirm={async () => {
              if (!deleting) {
                return { ok: false, errorKey: "crm.errors.notFound" };
              }
              return deleteCompany(deleting.id);
            }}
          />
        </>
      ) : null}
    </>
  );
}
