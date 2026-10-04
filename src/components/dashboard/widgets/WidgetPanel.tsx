import type { ReactNode } from "react";

interface WidgetPanelProps {
  title: string;
  desc: string;
  children: ReactNode;
}

export default function WidgetPanel({ title, desc, children }: WidgetPanelProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pt-4 pb-3 sm:px-6 dark:border-gray-800 dark:bg-white/3">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {title}
          </h3>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            {desc}
          </p>
        </div>
      </div>
      <div className="max-w-full overflow-x-auto">{children}</div>
    </div>
  );
}
