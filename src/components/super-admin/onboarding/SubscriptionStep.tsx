import { useLocale, useTranslations } from "next-intl";
import type { WizardPlanOption, WizardState } from "./types";

interface SubscriptionStepProps {
  value: WizardState;
  plans: WizardPlanOption[];
  onChange: (patch: Partial<WizardState>) => void;
}

const SubscriptionStep: React.FC<SubscriptionStepProps> = ({
  value,
  plans,
  onChange,
}) => {
  const tO = useTranslations("superAdmin.onboarding");
  const locale = useLocale();

  const formatPrice = (plan: WizardPlanOption) => {
    if (plan.priceCents === 0) {
      return tO("subscription.free");
    }
    const amount = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: plan.currency,
    }).format(plan.priceCents / 100);
    return plan.interval === "YEAR"
      ? `${amount} / ${plan.interval.toLowerCase()}`
      : `${amount} ${tO("subscription.perMonth")}`;
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {tO("subscription.description")}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => {
          const selected = value.planKey === plan.key;
          return (
            <label
              key={plan.key}
              className={`flex cursor-pointer flex-col gap-2 rounded-xl border p-4 transition ${
                selected
                  ? "border-brand-500 bg-brand-500/5 ring-2 ring-brand-500/30 dark:bg-brand-500/10"
                  : "border-gray-200 bg-white hover:border-brand-300 dark:border-gray-800 dark:bg-white/3 dark:hover:border-brand-800"
              }`}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  {plan.name}
                </span>
                <input
                  type="radio"
                  name="wiz-plan"
                  value={plan.key}
                  checked={selected}
                  onChange={() => onChange({ planKey: plan.key })}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
                />
              </span>
              <span className="text-title-sm font-semibold text-brand-500">
                {formatPrice(plan)}
              </span>
              {plan.description ? (
                <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                  {plan.description}
                </span>
              ) : null}
              {plan.trialDays > 0 ? (
                <span className="text-theme-xs font-medium text-success-600 dark:text-success-500">
                  {tO("subscription.trialNote", { days: plan.trialDays })}
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default SubscriptionStep;
