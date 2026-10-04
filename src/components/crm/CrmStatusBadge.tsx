"use client";

import { useTranslations } from "next-intl";

import Badge from "@/components/ui/badge/Badge";

type BadgeColor = "primary" | "success" | "error" | "warning" | "info" | "light" | "dark";

const leadStatusColors: Record<string, BadgeColor> = {
  NEW: "info",
  CONTACTED: "primary",
  QUALIFIED: "warning",
  PROPOSAL: "dark",
  WON: "success",
  LOST: "error",
};

const taskStatusColors: Record<string, BadgeColor> = {
  OPEN: "info",
  IN_PROGRESS: "primary",
  BLOCKED: "warning",
  DONE: "success",
  CANCELED: "light",
};

const customerStatusColors: Record<string, BadgeColor> = {
  ACTIVE: "success",
  INACTIVE: "warning",
  CHURNED: "error",
};

const followUpStatusColors: Record<string, BadgeColor> = {
  SCHEDULED: "info",
  COMPLETED: "success",
  MISSED: "error",
  CANCELED: "light",
};

const colorMaps = {
  lead: leadStatusColors,
  task: taskStatusColors,
  customer: customerStatusColors,
  followUp: followUpStatusColors,
};

const translationKeys = {
  lead: "crm.leadStatus",
  task: "crm.taskStatus",
  customer: "crm.customerStatus",
  followUp: "crm.followUpStatus",
};

interface CrmStatusBadgeProps {
  entity: keyof typeof colorMaps;
  status: string;
  size?: "sm" | "md";
}

export default function CrmStatusBadge({
  entity,
  status,
  size = "sm",
}: CrmStatusBadgeProps) {
  const t = useTranslations();
  const color = colorMaps[entity][status] ?? "light";
  return (
    <Badge size={size} color={color}>
      {t(`${translationKeys[entity]}.${status}`)}
    </Badge>
  );
}
