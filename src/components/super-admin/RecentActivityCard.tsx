import ComponentCard from "@/components/common/ComponentCard";
import { getLocale, getTranslations } from "next-intl/server";
import { auditMessageKey, auditParams } from "./statusBadge";
import type { RecentActivityEntry } from "./types";

const RecentActivityCard: React.FC<{
  entries: RecentActivityEntry[];
}> = async ({ entries }) => {
  const t = await getTranslations("superAdmin");
  const locale = await getLocale();
  const timeFormat = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <ComponentCard title={t("dashboard.recentActivity.title")}>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("dashboard.recentActivity.empty")}
        </p>
      ) : (
        <ul className="space-y-4">
          {entries.map((entry) => {
            const messageKey =
              entry.source === "audit" ? auditMessageKey(entry.action) : null;
            const text = messageKey
              ? t(`auditLog.actions.${messageKey}`, auditParams(entry.metadata))
              : (entry.summary ?? entry.action);
            return (
              <li
                key={`${entry.source}-${entry.id}`}
                className="flex flex-col gap-1 border-b border-gray-100 pb-4 last:border-0 last:pb-0 dark:border-gray-800"
              >
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {text}
                </p>
                <p className="text-theme-xs text-gray-400">
                  {timeFormat.format(new Date(entry.createdAt))}
                  {entry.organizationName
                    ? ` · ${entry.organizationName}`
                    : ""}
                  {entry.actorName
                    ? ` · ${t("dashboard.recentActivity.by")} ${entry.actorName}`
                    : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </ComponentCard>
  );
};

export default RecentActivityCard;
