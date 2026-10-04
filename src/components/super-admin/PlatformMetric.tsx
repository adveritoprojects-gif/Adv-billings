import type React from "react";

interface PlatformMetricProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

const PlatformMetric: React.FC<PlatformMetricProps> = ({
  label,
  value,
  icon,
}) => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 dark:border-gray-800 dark:bg-white/3">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
        <span className="[&>svg]:size-6 text-gray-800 dark:text-white/90">
          {icon}
        </span>
      </div>
      <div className="mt-5">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {label}
        </span>
        <h4 className="mt-2 text-title-sm font-bold text-gray-800 dark:text-white/90">
          {value}
        </h4>
      </div>
    </div>
  );
};

export default PlatformMetric;
