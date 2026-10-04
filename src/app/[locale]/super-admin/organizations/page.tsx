import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CreateOrganizationButton from "@/components/super-admin/CreateOrganizationButton";
import OnboardingWizardButton from "@/components/super-admin/OnboardingWizardButton";
import OrganizationsTable from "@/components/super-admin/OrganizationsTable";
import { listOrganizations } from "@/server/services/super-admin";
import { getTranslations } from "next-intl/server";

export default async function SuperAdminOrganizationsPage() {
  const t = await getTranslations("superAdmin");
  const organizations = await listOrganizations();

  return (
    <>
      <PageBreadcrumb pageTitle={t("organizations.title")} />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("organizations.description")}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <OnboardingWizardButton />
          <CreateOrganizationButton />
        </div>
      </div>
      <OrganizationsTable organizations={organizations} />
    </>
  );
}
