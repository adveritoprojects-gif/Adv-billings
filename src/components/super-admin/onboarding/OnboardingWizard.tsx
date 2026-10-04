"use client";

import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import { getIndustryTemplate } from "@/config/industry";
import { PlusIcon } from "@/icons";
import { onboardOrganizationAction } from "@/server/actions/super-admin";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import BusinessStep from "./BusinessStep";
import BrandingStep from "./BrandingStep";
import ConfirmStep from "./ConfirmStep";
import ModulesStep from "./ModulesStep";
import OwnerStep from "./OwnerStep";
import ReviewStep from "./ReviewStep";
import SubscriptionStep from "./SubscriptionStep";
import SuccessScreen from "./SuccessScreen";
import TemplateStep from "./TemplateStep";
import {
  WIZARD_STEP_KEYS,
  type WizardModuleOption,
  type WizardPlanOption,
  type WizardState,
  type WizardSuccess,
} from "./types";
import WizardStepper from "./WizardStepper";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

interface OnboardingWizardProps {
  plans: WizardPlanOption[];
  modules: WizardModuleOption[];
}

function initialState(plans: WizardPlanOption[]): WizardState {
  const template = getIndustryTemplate("general");
  return {
    name: "",
    slug: "",
    slugTouched: false,
    businessType: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    templateKey: template.key,
    logo: "",
    favicon: "",
    primaryColor: "",
    secondaryColor: "",
    moduleKeys: [...template.modules],
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "",
    planKey: plans[0]?.key ?? "",
  };
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  plans,
  modules,
}) => {
  const t = useTranslations();
  const tO = useTranslations("superAdmin.onboarding");
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(() => initialState(plans));
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [success, setSuccess] = useState<WizardSuccess | null>(null);
  const [isPending, startTransition] = useTransition();

  const update = (patch: Partial<WizardState>) =>
    setState((current) => ({ ...current, ...patch }));

  const canContinue = (index: number): boolean => {
    switch (WIZARD_STEP_KEYS[index]) {
      case "business":
        return (
          state.name.trim().length > 0 &&
          SLUG_RE.test(state.slug) &&
          (state.email === "" || EMAIL_RE.test(state.email)) &&
          state.phone.length <= 40 &&
          state.website.length <= 200 &&
          state.address.length <= 240 &&
          state.businessType.length <= 80
        );
      case "branding":
        return (
          (state.primaryColor === "" || HEX_RE.test(state.primaryColor)) &&
          (state.secondaryColor === "" || HEX_RE.test(state.secondaryColor))
        );
      case "owner":
        return (
          state.ownerName.trim().length > 0 && EMAIL_RE.test(state.ownerEmail)
        );
      case "subscription":
        return (
          state.planKey !== "" &&
          plans.some((plan) => plan.key === state.planKey)
        );
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!canContinue(step) || isPending) {
      return;
    }
    setErrorKey(null);
    setStep((current) => Math.min(current + 1, WIZARD_STEP_KEYS.length - 1));
  };

  const handleBack = () => {
    if (isPending) {
      return;
    }
    setErrorKey(null);
    setStep((current) => Math.max(current - 1, 0));
  };

  const handleSubmit = () => {
    if (!canContinue(WIZARD_STEP_KEYS.length - 1) || isPending) {
      return;
    }
    setErrorKey(null);
    const formData = new FormData();
    formData.set("name", state.name.trim());
    formData.set("slug", state.slug);
    formData.set("businessType", state.businessType);
    formData.set("email", state.email);
    formData.set("phone", state.phone);
    formData.set("website", state.website);
    formData.set("address", state.address);
    formData.set("templateKey", state.templateKey);
    formData.set("logo", state.logo);
    formData.set("primaryColor", state.primaryColor);
    formData.set("secondaryColor", state.secondaryColor);
    formData.set("favicon", state.favicon);
    state.moduleKeys.forEach((moduleKey) =>
      formData.append("modules", moduleKey),
    );
    formData.set("ownerName", state.ownerName);
    formData.set("ownerEmail", state.ownerEmail);
    formData.set("ownerPassword", state.ownerPassword);
    formData.set("planKey", state.planKey);
    startTransition(async () => {
      const result = await onboardOrganizationAction(formData);
      if (result.ok && result.organization) {
        setSuccess(result.organization);
      } else {
        setErrorKey(result.errorKey ?? "superAdmin.errors.generic");
      }
    });
  };

  const handleCreateAnother = () => {
    setState(initialState(plans));
    setStep(0);
    setErrorKey(null);
    setSuccess(null);
  };

  const stepLabels = WIZARD_STEP_KEYS.map((key) => tO(`steps.${key}`));
  const isLastStep = step === WIZARD_STEP_KEYS.length - 1;

  const renderStep = () => {
    switch (WIZARD_STEP_KEYS[step]) {
      case "business":
        return <BusinessStep value={state} onChange={update} />;
      case "template":
        return (
          <TemplateStep value={state} modules={modules} onChange={update} />
        );
      case "branding":
        return <BrandingStep value={state} onChange={update} />;
      case "modules":
        return (
          <ModulesStep value={state} modules={modules} onChange={update} />
        );
      case "owner":
        return <OwnerStep value={state} onChange={update} />;
      case "subscription":
        return (
          <SubscriptionStep
            value={state}
            plans={plans}
            onChange={update}
          />
        );
      case "review":
        return <ReviewStep value={state} modules={modules} plans={plans} />;
      case "create":
        return <ConfirmStep value={state} modules={modules} plans={plans} />;
      default:
        return null;
    }
  };

  return (
    <ComponentCard title={tO("title")} desc={tO("description")}>
      <div className="space-y-6">
        <WizardStepper
          current={step}
          labels={stepLabels}
          indicator={tO("stepIndicator", {
            current: step + 1,
            total: WIZARD_STEP_KEYS.length,
          })}
        />

        <div className="border-t border-gray-100 pt-5 dark:border-gray-800">
          {errorKey ? (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400"
            >
              {t(errorKey)}
            </div>
          ) : null}

          {success ? (
            <SuccessScreen
              success={success}
              modules={modules}
              onCreateAnother={handleCreateAnother}
            />
          ) : (
            <>
              <div>{renderStep()}</div>

              <div className="mt-6 flex items-center justify-between gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={isPending || step === 0}
                >
                  {tO("back")}
                </Button>
                {isLastStep ? (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isPending}
                    startIcon={<PlusIcon />}
                  >
                    {isPending ? tO("creating") : tO("createButton")}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={isPending || !canContinue(step)}
                  >
                    {tO("next")}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </ComponentCard>
  );
};

export default OnboardingWizard;
