import { getTranslations } from "next-intl/server";

import Badge from "@/components/ui/badge/Badge";
import ComponentCard from "@/components/common/ComponentCard";
import type { SubscriptionEventInfo } from "@/server/billing/types";

import { eventBadgeColor, eventLabelKey, stateLabelKey } from "./states";

function formatDateTime(date: Date): string {
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function SubscriptionHistory({
  events,
}: {
  events: SubscriptionEventInfo[];
}) {
  const t = await getTranslations("billing");
  return (
    <ComponentCard
      title={t("history.title")}
      desc={t("history.description")}
    >
      {events.length === 0 ? (
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          {t("history.empty")}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-white/5">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge color={eventBadgeColor(event.type)} size="sm">
                  {t(`history.${eventLabelKey(event.type)}`)}
                </Badge>
                {event.fromState && event.toState && (
                  <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                    {t("history.transition", {
                      from: t(stateLabelKey(event.fromState)),
                      to: t(stateLabelKey(event.toState)),
                    })}
                  </span>
                )}
                {event.planKey && (
                  <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                    {t("history.planLabel", {
                      plan: String(event.planKey).replaceAll("_", " "),
                    })}
                  </span>
                )}
              </div>
              <span className="text-theme-xs text-gray-400 dark:text-gray-500">
                {formatDateTime(event.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </ComponentCard>
  );
}
