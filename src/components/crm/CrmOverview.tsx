import ComponentCard from "@/components/common/ComponentCard";
import { formatDateTime } from "@/components/crm/format";
import type { CrmOverview } from "@/components/crm/types";
import {
  BoxCubeIcon,
  CheckLineIcon,
  GroupIcon,
  PaperPlaneIcon,
  TaskIcon,
  UserCircleIcon,
} from "@/icons";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

interface CrmOverviewProps {
  overview: CrmOverview;
}

export default async function CrmOverview({ overview }: CrmOverviewProps) {
  const t = await getTranslations("crm");

  const cards: {
    key: string;
    label: string;
    value: number;
    icon: ReactNode;
    href: string;
  }[] = [
    {
      key: "openLeads",
      label: t("overview.openLeads"),
      value: overview.leadsOpen,
      icon: <PaperPlaneIcon className="size-6" />,
      href: "/crm/leads",
    },
    {
      key: "wonLeads",
      label: t("overview.wonLeads"),
      value: overview.leadsWon,
      icon: <CheckLineIcon className="size-6" />,
      href: "/crm/leads",
    },
    {
      key: "contacts",
      label: t("overview.contacts"),
      value: overview.contactsTotal,
      icon: <GroupIcon className="size-6" />,
      href: "/crm/contacts",
    },
    {
      key: "companies",
      label: t("overview.companies"),
      value: overview.companiesTotal,
      icon: <BoxCubeIcon className="size-6" />,
      href: "/crm/companies",
    },
    {
      key: "customers",
      label: t("overview.customers"),
      value: overview.customersTotal,
      icon: <UserCircleIcon className="size-6" />,
      href: "/crm/customers",
    },
    {
      key: "openTasks",
      label: t("overview.openTasks"),
      value: overview.tasksOpen,
      icon: <TaskIcon className="size-6" />,
      href: "/crm/tasks",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className="group rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-brand-300 dark:border-gray-800 dark:bg-white/3 dark:hover:border-brand-500"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                {card.icon}
              </span>
              <span className="text-title-lg font-semibold text-gray-800 dark:text-white/90">
                {card.value}
              </span>
            </div>
            <p className="mt-4 text-theme-sm text-gray-500 dark:text-gray-400">
              {card.label}
            </p>
          </Link>
        ))}
      </div>

      <ComponentCard title={t("overview.recentActivity")}>
        {overview.recentActivities.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-title-sm font-medium text-gray-800 dark:text-white/90">
              {t("overview.emptyTitle")}
            </p>
            <p className="mt-1.5 text-theme-sm text-gray-500 dark:text-gray-400">
              {t("overview.emptyDescription")}
            </p>
          </div>
        ) : (
          <>
            <ol className="space-y-5 border-s border-gray-200 ps-5 dark:border-gray-800">
              {overview.recentActivities.map((activity) => (
                <li key={activity.id} className="relative">
                  <span className="absolute -start-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-brand-500/10" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-lg bg-gray-100 px-2 py-0.5 text-theme-xs font-medium text-gray-600 dark:bg-white/5 dark:text-gray-300">
                      {t(`activityType.${activity.type}`)}
                    </span>
                    {activity.leadId && activity.leadName ? (
                      <Link
                        href={`/crm/leads/${activity.leadId}`}
                        className="text-theme-sm font-medium text-gray-800 hover:text-brand-500 dark:text-white/90"
                      >
                        {activity.subject}
                      </Link>
                    ) : (
                      <span className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                        {activity.subject}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
                    {activity.actorName ?? "—"} · {formatDateTime(activity.occurredAt)}
                  </p>
                </li>
              ))}
            </ol>
            <div className="pt-2 text-center">
              <Link
                href="/crm/activities"
                className="text-theme-sm font-medium text-brand-500 hover:text-brand-600"
              >
                {t("overview.viewAll")} →
              </Link>
            </div>
          </>
        )}
      </ComponentCard>
    </div>
  );
}
