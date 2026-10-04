import { getIndustryTemplate } from "@/config/industry";
import { requirePageModule } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";
import { darken } from "@/utils/branding";
import { getTranslations } from "next-intl/server";

import widgetRegistry from "./widget-registry";

export default async function TemplateDashboard() {
  const ctx = await requirePageModule("dashboard", PERMISSIONS.DASHBOARD_READ);
  const t = await getTranslations("dashboard");
  const template = getIndustryTemplate(ctx.organization.templateKey);

  const currency = ctx.organization.currency ?? "USD";
  const primaryColor = ctx.organization.primaryColor ?? "#465fff";
  const secondaryColor = ctx.organization.secondaryColor
    ?? darken(primaryColor, 0.25);
  const firstName = ctx.user.name.split(" ")[0] || ctx.user.name;

  const widgetProps = {
    organizationId: ctx.organization.id,
    currency,
    primaryColor,
    secondaryColor,
    templateKey: ctx.organization.templateKey,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          {t("welcome", { name: firstName })}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("overview", { org: ctx.organization.name })}
        </p>
      </div>

      {template.widgets
        .filter((widget) => !widget.module || ctx.modules.includes(widget.module))
        .map((widget) => {
          const Widget = widgetRegistry[widget.key];
          return <Widget key={widget.key} {...widgetProps} />;
        })}
    </div>
  );
}
