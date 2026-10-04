import { getTranslations } from "next-intl/server";

import { ArrowUpIcon } from "@/icons";

export type UpgradePromptReason =
  | "subscription"
  | "expired"
  | "suspended"
  | "readonly"
  | "module";

export default async function UpgradePrompt({
  reason,
}: {
  reason: UpgradePromptReason;
}) {
  const t = await getTranslations("billing");
  return (
    <div className="rounded-2xl border border-warning-500/40 bg-warning-50 p-5 dark:border-warning-500/20 dark:bg-warning-500/10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-500/15 text-warning-600 dark:text-warning-400">
            <ArrowUpIcon className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
              {t("upgrade.title")}
            </h2>
            <p className="mt-1 text-theme-sm text-gray-600 dark:text-gray-400">
              {t(`upgrade.${reason}`)}
            </p>
          </div>
        </div>
        <a
          href="#plans"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-warning-500 px-5 py-2.5 text-theme-sm font-medium text-white shadow-theme-xs hover:bg-warning-600"
        >
          {t("upgrade.cta")}
          <ArrowUpIcon className="size-4" />
        </a>
      </div>
    </div>
  );
}
