import type { ReactNode } from "react";

interface CrmEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function CrmEmptyState({
  icon,
  title,
  description,
  action,
}: CrmEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500">
          {icon}
        </div>
      ) : null}
      <h3 className="text-title-sm font-medium text-gray-800 dark:text-white/90">
        {title}
      </h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-theme-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
