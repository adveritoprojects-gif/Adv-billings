import type {
  OnboardOrganizationSummary,
  OnboardingModuleOption,
  OnboardingPlanOption,
} from "@/server/services/super-admin";

export type WizardPlanOption = OnboardingPlanOption;
export type WizardModuleOption = OnboardingModuleOption;
export type WizardSuccess = OnboardOrganizationSummary;

export interface WizardState {
  name: string;
  slug: string;
  slugTouched: boolean;
  businessType: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  templateKey: string;
  logo: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  moduleKeys: string[];
  ownerName: string;
  ownerEmail: string;
  planKey: string;
}

export const WIZARD_STEP_KEYS = [
  "business",
  "template",
  "branding",
  "modules",
  "owner",
  "subscription",
  "review",
  "create",
] as const;

export type WizardStepKey = (typeof WIZARD_STEP_KEYS)[number];
