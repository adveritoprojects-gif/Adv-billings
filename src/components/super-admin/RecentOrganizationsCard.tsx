import ComponentCard from "@/components/common/ComponentCard";
import Badge from "@/components/ui/badge/Badge";
import { Link } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import type { OrganizationListRow } from "./types";
import { orgStatusColor } from "./statusBadge";

const RecentOrganizationsCard: React.FC<{
  organizations: OrganizationListRow[];
}> = async ({ organizations }) => {
  const t = await getTranslations("superAdmin");
  const locale = await getLocale();

  return (
    <ComponentCard title={t("dashboard.recentOrganizations.title")}>
      {organizations.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("dashboard.recentOrganizations.empty")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="pb-3 text-start font-medium text-gray-500 dark:text-gray-400">
                  {t("dashboard.recentOrganizations.columns.organization")}
                </th>
                <th className="pb-3 text-start font-medium text-gray-500 dark:text-gray-400">
                  {t("dashboard.recentOrganizations.columns.status")}
                </th>
                <th className="pb-3 text-start font-medium text-gray-500 dark:text-gray-400">
                  {t("dashboard.recentOrganizations.columns.plan")}
                </th>
                <th className="pb-3 text-start font-medium text-gray-500 dark:text-gray-400">
                  {t("dashboard.recentOrganizations.columns.members")}
                </th>
                <th className="pb-3 text-start font-medium text-gray-500 dark:text-gray-400">
                  {t("dashboard.recentOrganizations.columns.created")}
                </th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr
                  key={org.id}
                  className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                >
                  <td className="py-3 pe-4">
                    <span className="block font-medium text-gray-800 dark:text-white/90">
                      {org.name}
                    </span>
                    <span className="block text-theme-xs text-gray-400">
                      {org.slug}
                    </span>
                  </td>
                  <td className="py-3 pe-4">
                    <Badge color={orgStatusColor(org.status)} size="sm">
                      {t(`organizations.statuses.${org.status}`)}
                    </Badge>
                  </td>
                  <td className="py-3 pe-4 text-gray-600 dark:text-gray-400">
                    {org.planName ?? "—"}
                  </td>
                  <td className="py-3 pe-4 text-gray-600 dark:text-gray-400">
                    {org.memberCount}
                  </td>
                  <td className="py-3 pe-4 text-gray-600 dark:text-gray-400">
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                    }).format(new Date(org.createdAt))}
                  </td>
                  <td className="py-3 text-end">
                    <Link
                      href={`/super-admin/organizations/${org.id}`}
                      className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                    >
                      {t("dashboard.recentOrganizations.view")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ComponentCard>
  );
};

export default RecentOrganizationsCard;
