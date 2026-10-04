"use client";

import { useTranslations } from "next-intl";

import Badge from "@/components/ui/badge/Badge";

type BadgeColor = "primary" | "success" | "error" | "warning" | "info" | "light";

const priorityColors: Record<string, BadgeColor> = {
  LOW: "light",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "error",
};

interface CrmPriorityBadgeProps {
  priority: string;
  size?: "sm" | "md";
}

export default function CrmPriorityBadge({
  priority,
  size = "sm",
}: CrmPriorityBadgeProps) {
  const t = useTranslations();
  const color = priorityColors[priority] ?? "light";
  return (
    <Badge size={size} color={color}>
      {t(`crm.priority.${priority}`)}
    </Badge>
  );
}
