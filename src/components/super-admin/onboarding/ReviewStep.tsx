import { getIndustryTemplate } from "@/config/industry";
import { useTranslations } from "next-intl";
import type { WizardModuleOption, WizardPlanOption, WizardState } from "./types";

interface ReviewStepProps {
  value: WizardState;
  modules: WizardModuleOption[];
  plans: WizardPlanOption[];
}

const ReviewSection: React.FC<{
  title: string;
  rows: Array<{ label: string; value: React.ReactNode }>;
}> = ({ title, rows }) => (
  <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
    <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
      {title}
    </h4>
    <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="text-theme-xs text-gray-400">{row.label}</dt>
          <dd className="mt-0.5 text-sm text-gray-800 dark:text-white/90">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  </div>
);

const ReviewStep: React.FC<ReviewStepProps> = ({ value, modules, plans }) => {
  const tO = useTranslations("superAdmin.onboarding");
  const tTemplates = useTranslations("templates");
  const moduleName = new Map(modules.map((module) => [module.key, module.name]));
  const plan = plans.find((entry) => entry.key === value.planKey);
  const template = getIndustryTemplate(value.templateKey);
  const optionalModules = template.modules;
  const missingForPlan = value.moduleKeys.filter(
    (key) => plan && !plan.enabledModules.includes(key),
  );

  const valueOrNotSet = (input: string) =>
    input.trim() ? input : tO("review.notSet");

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {tO("review.description")}
      </p>

      <ReviewSection
        title={tO("review.business")}
        rows={[
          { label: tO("business.name"), value: valueOrNotSet(value.name) },
          { label: tO("business.slug"), value: valueOrNotSet(value.slug) },
          {
            label: tO("business.businessType"),
            value: valueOrNotSet(value.businessType),
          },
          { label: tO("business.email"), value: valueOrNotSet(value.email) },
          { label: tO("business.phone"), value: valueOrNotSet(value.phone) },
          { label: tO("business.website"), value: valueOrNotSet(value.website) },
          { label: tO("business.address"), value: valueOrNotSet(value.address) },
        ]}
      />

      <ReviewSection
        title={tO("review.template")}
        rows={[
          {
            label: tO("review.template"),
            value: tTemplates(`names.${value.templateKey}`),
          },
          {
            label: tO("review.modules"),
            value:
              optionalModules.length > 0
                ? optionalModules
                    .map((key) => moduleName.get(key) ?? key)
                    .join(", ")
                : tO("review.templateDefaults"),
          },
        ]}
      />

      <ReviewSection
        title={tO("review.branding")}
        rows={[
          { label: tO("branding.logo"), value: valueOrNotSet(value.logo) },
          {
            label: tO("branding.favicon"),
            value: valueOrNotSet(value.favicon),
          },
          {
            label: tO("branding.primaryColor"),
            value: value.primaryColor ? (
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block h-4 w-4 rounded-full border border-gray-200 dark:border-gray-700"
                  style={{ backgroundColor: value.primaryColor }}
                />
                {value.primaryColor}
              </span>
            ) : (
              tO("review.notSet")
            ),
          },
          {
            label: tO("branding.secondaryColor"),
            value: value.secondaryColor ? (
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block h-4 w-4 rounded-full border border-gray-200 dark:border-gray-700"
                  style={{ backgroundColor: value.secondaryColor }}
                />
                {value.secondaryColor}
              </span>
            ) : (
              tO("review.notSet")
            ),
          },
        ]}
      />

      <ReviewSection
        title={tO("review.modules")}
        rows={[
          {
            label: tO("review.modules"),
            value:
              value.moduleKeys.length > 0
                ? value.moduleKeys
                    .map((key) => moduleName.get(key) ?? key)
                    .join(", ")
                : tO("review.notSet"),
          },
        ]}
      />
      <p className="text-theme-xs text-gray-400">{tO("modules.coreNote")}</p>

      <ReviewSection
        title={tO("review.owner")}
        rows={[
          { label: tO("owner.name"), value: valueOrNotSet(value.ownerName) },
          {
            label: tO("owner.email"),
            value: valueOrNotSet(value.ownerEmail),
          },
        ]}
      />

      <ReviewSection
        title={tO("review.subscription")}
        rows={[
          {
            label: tO("review.subscription"),
            value: plan ? plan.name : tO("review.notSet"),
          },
          {
            label: tO("review.modules"),
            value:
              plan && plan.enabledModules.length > 0
                ? plan.enabledModules
                    .map((key) => moduleName.get(key) ?? key)
                    .join(", ")
                : tO("review.notSet"),
          },
        ]}
      />

      {plan && missingForPlan.length > 0 ? (
        <div
          role="alert"
          className="rounded-lg border border-warning-300 bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/15 dark:text-warning-400"
        >
          {tO("modules.planWarning", {
            plan: plan.name,
            modules: missingForPlan.map((key) => moduleName.get(key) ?? key).join(", "),
          })}
        </div>
      ) : null}
    </div>
  );
};

export default ReviewStep;
