import { getTranslations } from "next-intl/server";

import Badge from "@/components/ui/badge/Badge";

import { stateBadgeColor, stateLabelKey } from "./states";

export default async function StateBadge({
  state,
  size = "sm",
}: {
  state: string | null;
  size?: "sm" | "md";
}) {
  const t = await getTranslations("billing");
  return (
    <Badge color={stateBadgeColor(state)} size={size}>
      {t(stateLabelKey(state))}
    </Badge>
  );
}
