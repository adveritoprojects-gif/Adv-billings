import Checkbox from "@/components/form/input/Checkbox";
import { getIndustryTemplate } from "@/config/industry";
import { useTranslations } from "next-intl";
import type { WizardModuleOption, WizardState } from "./types";

interface ModulesStepProps {
  value: WizardState;
  modules: WizardModuleOption[];
  onChange: (patch: Partial<WizardState>) => void;
}

const ModulesStep: React.FC<ModulesStepProps> = ({
  value,
  modules,
  onChange,
}) => {
  const tO = useTranslations("superAdmin.onboarding");
  const template = getIndustryTemplate(value.templateKey);
  const templateKeys = new Set(template.modules);
  const coreModules = modules.filter((module) => module.isCore);
  const optionalModules = modules.filter(
    (module) => templateKeys.has(module.key),
  );

  const toggle = (moduleKey: string, checked: boolean) => {
    const next = new Set(value.moduleKeys);
    if (checked) {
      next.add(moduleKey);
    } else {
      next.delete(moduleKey);
    }
    onChange({ moduleKeys: [...next] });
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {tO("modules.description")}
      </p>

      <div>
        <p className="mb-3 text-theme-xs font-medium uppercase tracking-wide text-gray-400">
          {tO("modules.coreNote")}
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {coreModules.map((module) => (
            <Checkbox
              key={module.key}
              checked
              disabled
              label={module.name}
              onChange={() => undefined}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-theme-xs font-medium uppercase tracking-wide text-gray-400">
          {tO("template.defaultModules")}
        </p>
        {optionalModules.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {tO("modules.empty")}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {optionalModules.map((module) => {
              const checked = value.moduleKeys.includes(module.key);
              return (
                <li
                  key={module.key}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {module.name}
                    </p>
                    {module.description ? (
                      <p className="mt-0.5 text-theme-xs text-gray-400">
                        {module.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-theme-xs text-gray-400">
                      {checked
                        ? tO("modules.enabled")
                        : tO("modules.disabled")}
                    </span>
                    <Checkbox
                      checked={checked}
                      onChange={(next) => toggle(module.key, next)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ModulesStep;
