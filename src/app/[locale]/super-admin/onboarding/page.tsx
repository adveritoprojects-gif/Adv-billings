import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import OnboardingWizard from "@/components/super-admin/onboarding/OnboardingWizard";
import { listOnboardingOptions } from "@/server/services/super-admin";
import { getTranslations } from "next-intl/server";

export default async function SuperAdminOnboardingPage() {
  const t = await getTranslations("superAdmin");
  const { plans, modules } = await listOnboardingOptions();

  return (
    <>
      <PageBreadcrumb pageTitle={t("onboarding.title")} />
      <OnboardingWizard plans={plans} modules={modules} />
    </>
  );
}
