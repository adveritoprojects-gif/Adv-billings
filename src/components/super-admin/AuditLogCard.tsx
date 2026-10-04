import ComponentCard from "@/components/common/ComponentCard";
import { getLocale, getTranslations } from "next-intl/server";
import { auditMessageKey, auditParams } from "./statusBadge";
import type { AuditLogRow } from "./types";

const AuditLogCard: React.FC<{
  rows: AuditLogRow[];
}> = async ({ rows }) => {
  const t = await getTranslations("superAdmin");
  const locale = await getLocale();
  const timeFormat = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <ComponentCard
      title={t("auditLog.title")}
      desc={t("auditLog.description")}
    >
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("auditLog.empty")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="pb-3 text-start font-medium text-gray-500 dark:text-gray-400">
                  {t("auditLog.columns.when")}
                </th>
                <th className="pb-3 text-start font-medium text-gray-500 dark:text-gray-400">
                  {t("auditLog.columns.actor")}
                </th>
                <th className="pb-3 text-start font-medium text-gray-500 dark:text-gray-400">
                  {t("auditLog.columns.organization")}
                </th>
                <th className="pb-3 text-start font-medium text-gray-500 dark:text-gray-400">
                  {t("auditLog.columns.action")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const messageKey = auditMessageKey(row.action);
                const text = messageKey
                  ? t(
                      `auditLog.actions.${messageKey}`,
                      auditParams(row.metadata),
                    )
                  : row.summary;
                return (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                  >
                    <td className="py-3 pe-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                      {timeFormat.format(new Date(row.createdAt))}
                    </td>
                    <td className="py-3 pe-4 text-gray-700 dark:text-gray-300">
                      {row.actorName ?? t("auditLog.superAdmin")}
                    </td>
                    <td className="py-3 pe-4 text-gray-700 dark:text-gray-300">
                      {row.organizationName ?? t("auditLog.platform")}
                    </td>
                    <td className="py-3 text-gray-700 dark:text-gray-300">
                      {text}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </ComponentCard>
  );
};

export default AuditLogCard;
