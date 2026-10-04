import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ModulesList from "@/components/settings/ModulesList";
import SettingsTabs from "@/components/settings/SettingsTabs";
import { requirePageModule } from "@/server/auth/guards";
import {
  PERMISSIONS,
  hasPermission,
} from "@/server/auth/permissions";
import { listSettingModules } from "@/server/services/settings";
import { getTranslations } from "next-intl/server";

export default async function ModulesSettingsPage() {
  const ctx = await requirePageModule("settings", PERMISSIONS.MODULES_READ);
  const t = await getTranslations("settings");
  const modules = await listSettingModules(ctx);
  const canManage = hasPermission(
    ctx.role.key,
    ctx.permissions,
    PERMISSIONS.MODULES_MANAGE,
  );

  return (
    <>
      <PageBreadcrumb pageTitle={t("modules.title")} />
      <p className="-mt-4 mb-6 text-theme-sm text-gray-500 dark:text-gray-400">
        {t("modules.description")}
      </p>

      <SettingsTabs />

      <ModulesList modules={modules} canManage={canManage} />
    </>
  );
}
