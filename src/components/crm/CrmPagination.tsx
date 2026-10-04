"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { CRM_PAGE_SIZE } from "@/components/crm/types";

interface CrmPaginationProps {
  page: number;
  totalPages: number;
  total: number;
}

export default function CrmPagination({
  page,
  totalPages,
  total,
}: CrmPaginationProps) {
  const t = useTranslations("crm.common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (total === 0) {
    return null;
  }

  const goTo = (target: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (target <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(target));
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  const start = (page - 1) * CRM_PAGE_SIZE + 1;
  const end = Math.min(page * CRM_PAGE_SIZE, total);

  const windowSize = 5;
  let first = Math.max(1, page - Math.floor(windowSize / 2));
  const last = Math.min(totalPages, first + windowSize - 1);
  first = Math.max(1, last - windowSize + 1);
  const pages: number[] = [];
  for (let i = first; i <= last; i++) {
    pages.push(i);
  }

  const buttonClasses =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/3 dark:hover:text-gray-200";

  return (
    <div className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-theme-sm text-gray-500 dark:text-gray-400">
        {t("showingRange", { start, end, total })}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={buttonClasses}
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
        >
          {t("previous")}
        </button>
        {pages.map((value) => (
          <button
            key={value}
            type="button"
            className={`${buttonClasses} ${
              value === page
                ? "border-brand-500 bg-brand-500 text-white hover:bg-brand-600 hover:text-white dark:border-brand-500 dark:bg-brand-500 dark:text-white"
                : ""
            }`}
            onClick={() => goTo(value)}
            aria-current={value === page ? "page" : undefined}
          >
            {value}
          </button>
        ))}
        <button
          type="button"
          className={buttonClasses}
          onClick={() => goTo(page + 1)}
          disabled={page >= totalPages}
        >
          {t("next")}
        </button>
      </div>
    </div>
  );
}
