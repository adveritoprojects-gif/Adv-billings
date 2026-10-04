import CrmOverview from "@/components/crm/CrmOverview";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { listMembers } from "@/server/services/crm";
import { getCrmOverview } from "@/server/services/crm";
import { requirePageModule } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";
import { getTranslations } from "next-intl/server";

export default async function CrmHomePage() {
  const ctx = await requirePageModule("crm", PERMISSIONS.CRM_READ);
  const t = await getTranslations("crm");

  const members = await listMembers(ctx);
  const overview = await getCrmOverview(ctx, members);

  return (
    <>
      <PageBreadcrumb pageTitle={t("overview.title")} />
      <p className="mb-6 text-theme-sm text-gray-500 dark:text-gray-400">
        {t("overview.subtitle")}
      </p>
      <CrmOverview overview={overview} />
    </>
  );
}
