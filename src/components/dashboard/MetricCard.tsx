import { ArrowDownIcon, ArrowUpIcon } from "@/icons";
import type { ReactNode } from "react";
import Badge from "../ui/badge/Badge";

interface MetricCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  delta?: number;
  trend?: "up" | "down";
}

export default function MetricCard({
  label,
  value,
  icon,
  delta,
  trend,
}: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 dark:border-gray-800 dark:bg-white/3">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/15">
        <span className="text-brand-500 dark:text-brand-400">{icon}</span>
      </div>

      <div className="mt-5 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <span className="block truncate text-sm text-gray-500 dark:text-gray-400">
            {label}
          </span>
          <h4 className="mt-2 text-title-sm font-bold text-gray-800 dark:text-white/90">
            {value}
          </h4>
        </div>
        {delta !== undefined && trend !== undefined && (
          <Badge color={trend === "up" ? "success" : "error"}>
            {trend === "up" ? (
              <ArrowUpIcon />
            ) : (
              <ArrowDownIcon className="text-error-500" />
            )}
            {delta.toFixed(2)}%
          </Badge>
        )}
      </div>
    </div>
  );
}
