import { getTranslations } from "next-intl/server";

export default async function WidgetEmptyState() {
  const t = await getTranslations("dashboard.widgets");
  return (
    <p className="py-8 text-center text-theme-sm text-gray-500 dark:text-gray-400">
      {t("empty")}
    </p>
  );
}
