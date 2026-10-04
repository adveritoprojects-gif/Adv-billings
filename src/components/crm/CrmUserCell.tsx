function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

interface CrmUserCellProps {
  name: string | null | undefined;
}

export default function CrmUserCell({ name }: CrmUserCellProps) {
  if (!name) {
    return <span className="text-theme-sm text-gray-400 dark:text-gray-500">—</span>;
  }
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-theme-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
        {initials(name)}
      </span>
      <span className="truncate text-theme-sm text-gray-700 dark:text-gray-300">
        {name}
      </span>
    </span>
  );
}
