import ComponentCard from "@/components/common/ComponentCard";
import Badge from "@/components/ui/badge/Badge";
import { getTranslations } from "next-intl/server";

export interface OrgActivityRow {
  id: string;
  action: string;
  level: string;
  actorName: string | null;
  createdAt: Date;
}

const LEVEL_COLORS: Record<
  string,
  "primary" | "success" | "warning" | "error" | "info" | "light"
> = {
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  AUDIT: "primary",
};

const OrgActivityCard: React.FC<{
  rows: OrgActivityRow[];
}> = async ({ rows }) => {
  const t = await getTranslations("superAdmin");
  const timeFormat = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <ComponentCard
      title={t("detail.activity.title")}
      desc={t("detail.activity.description")}
    >
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("detail.activity.empty")}
        </p>
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-1 border-b border-gray-100 pb-4 last:border-0 last:pb-0 dark:border-gray-800"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {row.action}
                </span>
                <Badge
                  color={LEVEL_COLORS[row.level] ?? "light"}
                  size="sm"
                >
                  {t(`detail.activity.levels.${row.level}`)}
                </Badge>
              </div>
              <p className="text-theme-xs text-gray-400">
                {timeFormat.format(new Date(row.createdAt))}
                {row.actorName
                  ? ` · ${t("detail.activity.by")} ${row.actorName}`
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </ComponentCard>
  );
};

export default OrgActivityCard;
