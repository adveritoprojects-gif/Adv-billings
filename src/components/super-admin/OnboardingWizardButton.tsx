"use client";

import Button from "@/components/ui/button/Button";
import { useRouter } from "@/i18n/navigation";
import { ArrowRightIcon } from "@/icons";
import { useTranslations } from "next-intl";

const OnboardingWizardButton: React.FC = () => {
  const t = useTranslations("superAdmin");
  const router = useRouter();

  return (
    <Button
      size="sm"
      variant="outline"
      endIcon={<ArrowRightIcon />}
      onClick={() => router.push("/super-admin/onboarding")}
    >
      {t("organizations.wizard")}
    </Button>
  );
};

export default OnboardingWizardButton;
