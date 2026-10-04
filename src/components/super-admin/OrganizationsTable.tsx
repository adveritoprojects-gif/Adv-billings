"use client";

import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { Link } from "@/i18n/navigation";
import { ChevronDownIcon, SearchIcon } from "@/icons";
import {
  setOrganizationStatusAction,
} from "@/server/actions/super-admin";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { orgStatusColor } from "./statusBadge";
import type { OrganizationListRow } from "./types";

interface OrganizationsTableProps {
  organizations: OrganizationListRow[];
}

const STATUS_OPTIONS = ["ACTIVE", "TRIAL", "SUSPENDED", "ARCHIVED"];

const OrganizationsTable: React.FC<OrganizationsTableProps> = ({
  organizations,
}) => {
  const t = useTranslations();
  const tSa = useTranslations("superAdmin");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return organizations.filter((org) => {
      if (status && org.status !== status) {
        return false;
      }
      if (!needle) {
        return true;
      }
      return (
        org.name.toLowerCase().includes(needle) ||
        org.slug.toLowerCase().includes(needle) ||
        (org.businessType ?? "").toLowerCase().includes(needle)
      );
    });
  }, [organizations, query, status]);

  const handleToggleStatus = (org: OrganizationListRow) => {
    setErrorKey(null);
    startTransition(async () => {
      const nextStatus = org.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
      const result = await setOrganizationStatusAction(org.id, nextStatus);
      if (!result.ok && result.errorKey) {
        setErrorKey(result.errorKey);
      }
    });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
        <div className="relative w-full sm:max-w-xs">
          <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4 text-gray-400">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tSa("organizations.searchPlaceholder")}
            aria-label={tSa("organizations.searchPlaceholder")}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent ps-11 pe-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          />
        </div>
        <div className="relative">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label={tSa("organizations.filters.status")}
            className="h-11 w-auto min-w-40 appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
          >
            <option value="" className="text-gray-700 dark:bg-gray-900">
              {tSa("organizations.filters.allStatuses")}
            </option>
            {STATUS_OPTIONS.map((option) => (
              <option
                key={option}
                value={option}
                className="text-gray-700 dark:bg-gray-900"
              >
                {tSa(`organizations.statuses.${option}`)}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3 text-gray-400">
            <ChevronDownIcon />
          </span>
        </div>
      </div>

      {errorKey ? (
        <div className="m-4 rounded-lg border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
          {t(errorKey)}
        </div>
      ) : null}

      <div className="overflow-x-auto p-4 sm:p-6">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {organizations.length === 0
              ? tSa("organizations.empty")
              : tSa("organizations.noResults")}
          </p>
        ) : (
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="pb-3 text-start font-medium text-gray-500 dark:text-gray-400">
                  {tSa("organizations.columns.organization")}
                </th>
                <th className="pb-3 text-start font-medium text-gray-500 dark:text-gray-400">
                  {tSa("organizations.columns.status")}
                </th>
                <th className="pb-3 text-start font-medium text-gray-500 dark:text-gray-400">
                  {tSa("organizations.columns.plan")}
                </th>
                <th className="pb-3 text-start font-medium text-gray-500 dark:text-gray-400">
                  {tSa("organizations.columns.members")}
                </th>
                <th className="pb-3 text-start font-medium text-gray-500 dark:text-gray-400">
                  {tSa("organizations.columns.created")}
                </th>
                <th className="pb-3 text-end font-medium text-gray-500 dark:text-gray-400">
                  {tSa("organizations.columns.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((org) => (
                <tr
                  key={org.id}
                  className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                >
                  <td className="py-3 pe-4">
                    <span className="block font-medium text-gray-800 dark:text-white/90">
                      {org.name}
                    </span>
                    <span className="block text-theme-xs text-gray-400">
                      {org.slug}
                    </span>
                  </td>
                  <td className="py-3 pe-4">
                    <Badge color={orgStatusColor(org.status)} size="sm">
                      {tSa(`organizations.statuses.${org.status}`)}
                    </Badge>
                  </td>
                  <td className="py-3 pe-4 text-gray-600 dark:text-gray-400">
                    {org.planName ?? "—"}
                  </td>
                  <td className="py-3 pe-4 text-gray-600 dark:text-gray-400">
                    {org.memberCount}
                  </td>
                  <td className="py-3 pe-4 text-gray-600 dark:text-gray-400">
                    {org.createdAt instanceof Date
                      ? org.createdAt.toLocaleDateString()
                      : new Date(org.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/super-admin/organizations/${org.id}`}
                        className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                      >
                        {tSa("organizations.view")}
                      </Link>
                      <Button
                        size="sm"
                        variant={org.status === "SUSPENDED" ? "primary" : "outline"}
                        onClick={() => handleToggleStatus(org)}
                        disabled={isPending}
                      >
                        {org.status === "SUSPENDED"
                          ? tSa("organizations.activate")
                          : tSa("organizations.suspend")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default OrganizationsTable;
