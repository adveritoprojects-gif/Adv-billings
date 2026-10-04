import { INDUSTRY_TEMPLATE_KEYS, getIndustryTemplate } from "@/config/industry";
import { useTranslations } from "next-intl";
import type { WizardModuleOption, WizardState } from "./types";

interface TemplateStepProps {
  value: WizardState;
  modules: WizardModuleOption[];
  onChange: (patch: Partial<WizardState>) => void;
}

const TemplateStep: React.FC<TemplateStepProps> = ({
  value,
  modules,
  onChange,
}) => {
  const tO = useTranslations("superAdmin.onboarding");
  const tTemplates = useTranslations("templates");
  const moduleName = new Map(modules.map((module) => [module.key, module.name]));

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {tO("template.description")}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {INDUSTRY_TEMPLATE_KEYS.map((key) => {
          const selected = value.templateKey === key;
          const template = getIndustryTemplate(key);
          return (
            <label
              key={key}
              className={`flex cursor-pointer flex-col gap-3 rounded-xl border p-4 transition ${
                selected
                  ? "border-brand-500 bg-brand-500/5 ring-2 ring-brand-500/30 dark:bg-brand-500/10"
                  : "border-gray-200 bg-white hover:border-brand-300 dark:border-gray-800 dark:bg-white/3 dark:hover:border-brand-800"
              }`}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  {tTemplates(`names.${key}`)}
                </span>
                <input
                  type="radio"
                  name="wiz-template"
                  value={key}
                  checked={selected}
                  onChange={() =>
                    onChange({
                      templateKey: key,
                      moduleKeys: [...template.modules],
                    })
                  }
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
                />
              </span>
              <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                {tTemplates(`descriptions.${key}`)}
              </span>
              <span className="flex flex-wrap gap-1.5">
                {template.modules.length === 0 ? (
                  <span className="text-theme-xs text-gray-400">
                    {tO("template.noModules")}
                  </span>
                ) : (
                  template.modules.map((moduleKey) => (
                    <span
                      key={moduleKey}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-theme-xs text-gray-600 dark:bg-white/10 dark:text-gray-300"
                    >
                      {moduleName.get(moduleKey) ?? moduleKey}
                    </span>
                  ))
                )}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default TemplateStep;
