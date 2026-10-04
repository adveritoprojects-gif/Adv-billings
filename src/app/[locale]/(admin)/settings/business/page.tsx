import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BusinessForm from "@/components/settings/BusinessForm";
import SettingsTabs from "@/components/settings/SettingsTabs";
import { requirePageModule } from "@/server/auth/guards";
import {
  PERMISSIONS,
  hasPermission,
} from "@/server/auth/permissions";
import { getBusinessSettings } from "@/server/services/settings";
import { getTranslations } from "next-intl/server";

export default async function BusinessSettingsPage() {
  const ctx = await requirePageModule("settings", PERMISSIONS.SETTINGS_READ);
  const t = await getTranslations("settings");
  const initial = getBusinessSettings(ctx);
  const canEdit = hasPermission(
    ctx.role.key,
    ctx.permissions,
    PERMISSIONS.ORGANIZATION_UPDATE,
  );

  return (
    <>
      <PageBreadcrumb pageTitle={t("business.title")} />
      <p className="-mt-4 mb-6 text-theme-sm text-gray-500 dark:text-gray-400">
        {t("business.description")}
      </p>

      <SettingsTabs />

      <div className="max-w-screen-md">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
          <BusinessForm initial={initial} canEdit={canEdit} />
        </div>
      </div>
    </>
  );
}
