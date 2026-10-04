"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ChevronDownIcon, SearchIcon } from "@/icons";

export interface CrmFilterOption {
  value: string;
  label: string;
}

export interface CrmFilter {
  name: string;
  label: string;
  options: CrmFilterOption[];
}

interface CrmToolbarProps {
  placeholder: string;
  filters?: CrmFilter[];
}

export default function CrmToolbar({
  placeholder,
  filters = [],
}: CrmToolbarProps) {
  const t = useTranslations("crm.common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [searchValue, setSearchValue] = useState(initialQ);
  const skipFirst = useRef(true);

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    params.delete("page");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    const handle = setTimeout(() => {
      const current = searchParams.get("q") ?? "";
      if (searchValue.trim() !== current) {
        updateParams({ q: searchValue.trim() });
      }
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative w-full sm:max-w-xs">
        <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4 text-gray-400">
          <SearchIcon />
        </span>
        <input
          type="search"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder={placeholder}
          aria-label={t("search")}
          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent ps-11 pe-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {filters.map((filter) => (
          <div key={filter.name} className="relative">
            <select
              aria-label={filter.label}
              value={searchParams.get(filter.name) ?? ""}
              onChange={(event) =>
                updateParams({ [filter.name]: event.target.value })
              }
              className="h-11 w-auto min-w-36 appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
            >
              <option value="" className="text-gray-700 dark:bg-gray-900">
                {t("allFilter", { label: filter.label })}
              </option>
              {filter.options.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="text-gray-700 dark:bg-gray-900"
                >
                  {option.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3 text-gray-400">
              <ChevronDownIcon />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
