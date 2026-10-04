import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import SettingsTabs from "@/components/settings/SettingsTabs";
import UsersTable from "@/components/settings/UsersTable";
import { requirePageModule } from "@/server/auth/guards";
import {
  PERMISSIONS,
  hasPermission,
} from "@/server/auth/permissions";
import { listSettingMembers } from "@/server/services/settings";
import { getTranslations } from "next-intl/server";

export default async function UsersSettingsPage() {
  const ctx = await requirePageModule("settings", PERMISSIONS.MEMBERS_READ);
  const t = await getTranslations("settings");
  const data = await listSettingMembers(ctx);
  const canManage = hasPermission(
    ctx.role.key,
    ctx.permissions,
    PERMISSIONS.MEMBERS_MANAGE,
  );

  return (
    <>
      <PageBreadcrumb pageTitle={t("users.title")} />
      <p className="-mt-4 mb-6 text-theme-sm text-gray-500 dark:text-gray-400">
        {t("users.description")}
      </p>

      <SettingsTabs />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <UsersTable data={data} canManage={canManage} />
      </div>
    </>
  );
}
