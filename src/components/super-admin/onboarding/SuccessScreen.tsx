import Button from "@/components/ui/button/Button";
import { useRouter } from "@/i18n/navigation";
import { ArrowRightIcon, CheckCircleIcon } from "@/icons";
import { useLocale, useTranslations } from "next-intl";
import type { WizardModuleOption, WizardSuccess } from "./types";

interface SuccessScreenProps {
  success: WizardSuccess;
  modules: WizardModuleOption[];
  onCreateAnother: () => void;
}

const SuccessScreen: React.FC<SuccessScreenProps> = ({
  success,
  modules,
  onCreateAnother,
}) => {
  const tO = useTranslations("superAdmin.onboarding");
  const tSa = useTranslations("superAdmin");
  const tTemplates = useTranslations("templates");
  const locale = useLocale();
  const router = useRouter();
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const moduleName = new Map(
    modules.map((module) => [module.key, module.name]),
  );

  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: tO("success.orgName"), value: success.name },
    { label: tO("success.slug"), value: success.slug },
    { label: tO("success.status"), value: tSa(`organizations.statuses.${success.status}`) },
    {
      label: tO("success.template"),
      value: tTemplates(`names.${success.templateKey}`),
    },
    { label: tO("success.owner"), value: success.owner.name },
    { label: tO("success.email"), value: success.owner.email },
    { label: tO("success.plan"), value: success.plan.name },
    {
      label: tO("success.state"),
      value: tO(`success.states.${success.plan.state}`),
    },
    {
      label: tO("success.modules"),
      value:
        success.modules.length > 0
          ? success.modules
              .map((key) => moduleName.get(key) ?? key)
              .join(", ")
          : tO("review.notSet"),
    },
    {
      label: tO("success.roles"),
      value:
        success.roles.length > 0
          ? success.roles.join(", ")
          : tO("success.noRoles"),
    },
  ];

  if (success.plan.trialEndsAt) {
    rows.push({
      label: tSa("detail.subscription.trialEnds"),
      value: dateFormat.format(new Date(success.plan.trialEndsAt)),
    });
  }
  if (success.plan.currentPeriodEnd) {
    rows.push({
      label: tSa("detail.subscription.currentPeriod"),
      value: dateFormat.format(new Date(success.plan.currentPeriodEnd)),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4 rounded-xl border border-success-300 bg-success-50 p-4 dark:border-success-500/30 dark:bg-success-500/15">
        <CheckCircleIcon className="mt-0.5 h-6 w-6 shrink-0 text-success-600 dark:text-success-400" />
        <div>
          <h3 className="text-sm font-semibold text-success-700 dark:text-success-400">
            {tO("success.title")}
          </h3>
          <p className="mt-1 text-sm text-success-700 dark:text-success-400">
            {tO("success.description", { name: success.name })}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-theme-xs text-gray-400">{row.label}</dt>
            <dd className="mt-1 text-sm font-medium break-words text-gray-800 dark:text-white/90">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          onClick={onCreateAnother}
        >
          {tO("success.createAnother")}
        </Button>
        <Button
          endIcon={<ArrowRightIcon />}
          onClick={() => router.push(`/super-admin/organizations/${success.id}`)}
        >
          {tO("success.viewOrganization")}
        </Button>
      </div>
    </div>
  );
};

export default SuccessScreen;
