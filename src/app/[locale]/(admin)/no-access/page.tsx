import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { LockIcon } from "@/icons";
import { requirePageAuth } from "@/server/auth/guards";

export default async function NoAccessPage() {
  await requirePageAuth();
  const t = await getTranslations("noAccess");

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
          <LockIcon className="size-7" />
        </span>
        <h2 className="mt-5 text-xl font-semibold text-gray-800 dark:text-white/90">
          {t("title")}
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t("description")}
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-2.5 text-theme-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
        >
          {t("goHome")}
        </Link>
      </div>
    </div>
  );
}
