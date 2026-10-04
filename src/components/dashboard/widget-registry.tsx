import type { ComponentType } from "react";

import type { DashboardWidgetKey } from "@/config/industry";

import LowStockWidget from "./widgets/LowStockWidget";
import MetricsWidget from "./widgets/MetricsWidget";
import RecentLeadsWidget from "./widgets/RecentLeadsWidget";
import RecentOrdersWidget from "./widgets/RecentOrdersWidget";
import RecentStudentsWidget from "./widgets/RecentStudentsWidget";
import RecentTasksWidget from "./widgets/RecentTasksWidget";
import RevenueWidget from "./widgets/RevenueWidget";
import TopProductsWidget from "./widgets/TopProductsWidget";
import type { DashboardWidgetProps } from "./widgets/widget-registry-types";

const widgetRegistry: Record<
  DashboardWidgetKey,
  ComponentType<DashboardWidgetProps>
> = {
  metrics: MetricsWidget,
  "revenue-chart": RevenueWidget,
  "recent-leads": RecentLeadsWidget,
  "recent-orders": RecentOrdersWidget,
  "top-products": TopProductsWidget,
  "low-stock": LowStockWidget,
  "recent-tasks": RecentTasksWidget,
  "recent-students": RecentStudentsWidget,
};

export default widgetRegistry;
