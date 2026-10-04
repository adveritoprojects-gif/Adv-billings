import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PlatformMetric from "@/components/super-admin/PlatformMetric";
import RecentActivityCard from "@/components/super-admin/RecentActivityCard";
import RecentOrganizationsCard from "@/components/super-admin/RecentOrganizationsCard";
import type {
  RecentActivityEntry,
} from "@/components/super-admin/types";
import {
  AlertIcon,
  BoxCubeIcon,
  CalenderIcon,
  CheckCircleIcon,
  DollarLineIcon,
  FileIcon,
  GroupIcon,
} from "@/icons";
import { systemDb } from "@/server/db";
import { getPlatformMetrics, listOrganizations } from "@/server/services/super-admin";
import { getTranslations } from "next-intl/server";

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default async function SuperAdminDashboardPage() {
  const t = await getTranslations("superAdmin");

  const [metrics, organizations, activityRows, auditRows] = await Promise.all([
    getPlatformMetrics(),
    listOrganizations(),
    systemDb.activityLog.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        organization: { select: { name: true } },
        actor: { select: { name: true } },
      },
    }),
    systemDb.platformAuditLog.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        organization: { select: { name: true } },
        actor: { select: { name: true } },
      },
    }),
  ]);

  const activityEntries: RecentActivityEntry[] = [
    ...activityRows.map((row) => ({
      id: row.id,
      source: "activity" as const,
      action: row.action,
      metadata: row.metadata,
      createdAt: row.createdAt,
      actorName: row.actor?.name ?? null,
      organizationName: row.organization.name,
    })),
    ...auditRows.map((row) => ({
      id: row.id,
      source: "audit" as const,
      action: row.action,
      summary: row.summary,
      metadata: row.metadata,
      createdAt: row.createdAt,
      actorName: row.actor?.name ?? null,
      organizationName: row.organization?.name ?? null,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 8);

  const metricItems = [
    {
      key: "totalOrganizations",
      value: String(metrics.totalOrganizations),
      icon: <BoxCubeIcon className="text-gray-800 dark:text-white/90" />,
    },
    {
      key: "activeOrganizations",
      value: String(metrics.activeOrganizations),
      icon: <CheckCircleIcon className="text-gray-800 dark:text-white/90" />,
    },
    {
      key: "trialOrganizations",
      value: String(metrics.trialOrganizations),
      icon: <CalenderIcon className="text-gray-800 dark:text-white/90" />,
    },
    {
      key: "suspendedOrganizations",
      value: String(metrics.suspendedOrganizations),
      icon: <AlertIcon className="text-gray-800 dark:text-white/90" />,
    },
    {
      key: "totalUsers",
      value: String(metrics.totalUsers),
      icon: <GroupIcon className="text-gray-800 dark:text-white/90" />,
    },
    {
      key: "activeSubscriptions",
      value: String(metrics.activeSubscriptions),
      icon: <FileIcon className="text-gray-800 dark:text-white/90" />,
    },
    {
      key: "mrr",
      value: formatCurrency(metrics.mrrCents, metrics.mrrCurrency),
      icon: <DollarLineIcon className="text-gray-800 dark:text-white/90" />,
    },
  ];

  return (
    <>
      <PageBreadcrumb pageTitle={t("dashboard.title")} />
      <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
        {t("dashboard.description")}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6 xl:grid-cols-4">
        {metricItems.map((item) => (
          <PlatformMetric
            key={item.key}
            label={t(`dashboard.metrics.${item.key}`)}
            value={item.value}
            icon={item.icon}
          />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RecentOrganizationsCard organizations={organizations.slice(0, 5)} />
        </div>
        <RecentActivityCard entries={activityEntries} />
      </div>
    </>
  );
}
