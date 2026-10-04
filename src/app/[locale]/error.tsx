"use client";

import Button from "@/components/ui/button/Button";
import { useTranslations } from "next-intl";

interface LocaleErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function LocaleError({ reset }: LocaleErrorProps) {
  const t = useTranslations("errorPage");

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-white/3">
        <h2 className="text-title-md font-semibold text-gray-800 dark:text-white/90">
          {t("title")}
        </h2>
        <p className="mt-2 text-theme-sm text-gray-500 dark:text-gray-400">
          {t("description")}
        </p>
        <div className="mt-6">
          <Button size="sm" onClick={reset}>
            {t("retry")}
          </Button>
        </div>
      </div>
    </div>
  );
}
