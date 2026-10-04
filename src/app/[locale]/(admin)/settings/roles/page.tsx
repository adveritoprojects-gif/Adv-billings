import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import RolesTable from "@/components/settings/RolesTable";
import SettingsTabs from "@/components/settings/SettingsTabs";
import { requirePageModule } from "@/server/auth/guards";
import {
  PERMISSIONS,
  hasPermission,
} from "@/server/auth/permissions";
import { listSettingRoles } from "@/server/services/settings";
import { getTranslations } from "next-intl/server";

export default async function RolesSettingsPage() {
  const ctx = await requirePageModule("settings", PERMISSIONS.ROLES_READ);
  const t = await getTranslations("settings");
  const data = await listSettingRoles(ctx);
  const canManage = hasPermission(
    ctx.role.key,
    ctx.permissions,
    PERMISSIONS.ROLES_MANAGE,
  );

  return (
    <>
      <PageBreadcrumb pageTitle={t("roles.title")} />
      <p className="-mt-4 mb-6 text-theme-sm text-gray-500 dark:text-gray-400">
        {t("roles.description")}
      </p>

      <SettingsTabs />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <RolesTable data={data} canManage={canManage} />
      </div>
    </>
  );
}
