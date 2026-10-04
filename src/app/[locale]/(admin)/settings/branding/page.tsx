import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BrandingForm from "@/components/settings/BrandingForm";
import SettingsTabs from "@/components/settings/SettingsTabs";
import { requirePageModule } from "@/server/auth/guards";
import {
  PERMISSIONS,
  hasPermission,
} from "@/server/auth/permissions";
import { getBrandingSettings } from "@/server/services/settings";
import { getTranslations } from "next-intl/server";

export default async function BrandingSettingsPage() {
  const ctx = await requirePageModule("settings", PERMISSIONS.SETTINGS_READ);
  const t = await getTranslations("settings");
  const initial = await getBrandingSettings(ctx);
  const canEdit = hasPermission(
    ctx.role.key,
    ctx.permissions,
    PERMISSIONS.ORGANIZATION_UPDATE,
  );

  return (
    <>
      <PageBreadcrumb pageTitle={t("branding.title")} />
      <p className="-mt-4 mb-6 text-theme-sm text-gray-500 dark:text-gray-400">
        {t("branding.description")}
      </p>

      <SettingsTabs />

      <BrandingForm
        initial={initial}
        orgName={ctx.organization.name}
        canEdit={canEdit}
      />
    </>
  );
}
