"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";

import { AngleDownIcon, AngleUpIcon } from "@/icons";

interface CrmSortHeaderProps {
  label: string;
  field: string;
  sort: string;
  dir: string;
}

const dateFields = ["createdAt", "updatedAt", "occurredAt", "dueAt", "dueDate"];

export default function CrmSortHeader({
  label,
  field,
  sort,
  dir,
}: CrmSortHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isCurrent = sort === field;
  const nextDir = isCurrent
    ? dir === "asc"
      ? "desc"
      : "asc"
    : dateFields.includes(field)
      ? "desc"
      : "asc";

  const params = new URLSearchParams(searchParams.toString());
  params.set("sort", field);
  params.set("dir", nextDir);
  params.delete("page");
  const query = params.toString();

  return (
    <th
      scope="col"
      aria-sort={isCurrent ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className="whitespace-nowrap px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
    >
      <Link
        href={query ? `${pathname}?${query}` : pathname}
        className={`inline-flex items-center gap-1 transition hover:text-gray-700 dark:hover:text-gray-200 ${
          isCurrent ? "text-gray-800 dark:text-white/90" : ""
        }`}
      >
        {label}
        {isCurrent ? (
          dir === "asc" ? (
            <AngleUpIcon className="text-brand-500" width="12" height="12" />
          ) : (
            <AngleDownIcon className="text-brand-500" width="12" height="12" />
          )
        ) : null}
      </Link>
    </th>
  );
}
