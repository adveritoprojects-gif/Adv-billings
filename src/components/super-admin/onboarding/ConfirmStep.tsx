import { useTranslations } from "next-intl";
import type { WizardModuleOption, WizardPlanOption, WizardState } from "./types";

interface ConfirmStepProps {
  value: WizardState;
  modules: WizardModuleOption[];
  plans: WizardPlanOption[];
}

const ConfirmStep: React.FC<ConfirmStepProps> = ({ value, modules, plans }) => {
  const tO = useTranslations("superAdmin.onboarding");
  const tTemplates = useTranslations("templates");
  const moduleName = new Map(modules.map((module) => [module.key, module.name]));
  const plan = plans.find((entry) => entry.key === value.planKey);

  const items = [
    {
      label: tO("review.business"),
      value: value.name,
    },
    {
      label: tO("review.template"),
      value: tTemplates(`names.${value.templateKey}`),
    },
    {
      label: tO("review.owner"),
      value: value.ownerEmail,
    },
    {
      label: tO("review.subscription"),
      value: plan ? plan.name : value.planKey,
    },
    {
      label: tO("review.modules"),
      value:
        value.moduleKeys.length > 0
          ? value.moduleKeys
              .map((key) => moduleName.get(key) ?? key)
              .join(", ")
          : tO("review.notSet"),
    },
    {
      label: tO("review.branding"),
      value: value.primaryColor || tO("review.notSet"),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/3">
        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
          {tO("confirm.ready", { name: value.name })}
        </p>
        <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
          {tO("confirm.description")}
        </p>
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label}>
            <dt className="text-theme-xs text-gray-400">{item.label}</dt>
            <dd className="mt-1 text-sm text-gray-800 dark:text-white/90">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-theme-xs text-gray-400">{tO("modules.coreNote")}</p>
    </div>
  );
};

export default ConfirmStep;
