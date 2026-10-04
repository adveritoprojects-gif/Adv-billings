import { CheckLineIcon } from "@/icons";

interface WizardStepperProps {
  current: number;
  labels: string[];
  indicator: string;
}

const WizardStepper: React.FC<WizardStepperProps> = ({
  current,
  labels,
  indicator,
}) => {
  return (
    <div>
      <div className="no-scrollbar overflow-x-auto">
        <ol className="hidden sm:flex sm:items-center">
          {labels.map((label, index) => {
            const isDone = index < current;
            const isCurrent = index === current;
            return (
              <li
                key={label}
                className="flex flex-1 items-center gap-2 last:flex-none"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-theme-xs font-medium ${
                    isDone
                      ? "bg-brand-500 text-white"
                      : isCurrent
                        ? "bg-brand-500/10 text-brand-500 ring-2 ring-brand-500/40 dark:bg-brand-500/15"
                        : "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400"
                  }`}
                >
                  {isDone ? (
                    <CheckLineIcon className="h-3.5 w-3.5" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={`text-theme-xs whitespace-nowrap ${
                    isCurrent
                      ? "font-medium text-brand-500"
                      : isDone
                        ? "text-gray-700 dark:text-gray-300"
                        : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {label}
                </span>
                {index < labels.length - 1 ? (
                  <span
                    className={`ms-2 h-px flex-1 ${
                      index < current
                        ? "bg-brand-500/50"
                        : "bg-gray-200 dark:bg-white/10"
                    }`}
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-gray-800 dark:text-white/90">
            {labels[current]}
          </span>
          <span className="text-theme-xs text-gray-400">{indicator}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
          <div
            className="h-1.5 rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${((current + 1) / labels.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default WizardStepper;
