"use client";

interface CrmInlineSelectProps {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
}

export default function CrmInlineSelect({
  value,
  options,
  onChange,
  ariaLabel,
  disabled = false,
}: CrmInlineSelectProps) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      disabled={disabled}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 cursor-pointer rounded-lg border border-gray-300 bg-transparent px-2.5 py-1 text-theme-xs font-medium text-gray-700 hover:border-brand-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-brand-500"
    >
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          className="text-gray-700 dark:bg-gray-900"
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}
