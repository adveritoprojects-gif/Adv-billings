import type { IndustryTemplate } from "./types";

export const generalTemplate: IndustryTemplate = {
  key: "general",
  modules: ["crm", "sales", "tasks", "projects", "finance", "reports"],
  nav: [
    { key: "dashboard" },
    { key: "crm" },
    { key: "sales" },
    { key: "tasks" },
    { key: "projects" },
    { key: "finance" },
    { key: "reports" },
    { key: "settings" },
  ],
  widgets: [
    { key: "metrics" },
    { key: "revenue-chart" },
    { key: "recent-leads", module: "crm" },
    { key: "recent-tasks", module: "tasks" },
  ],
};
