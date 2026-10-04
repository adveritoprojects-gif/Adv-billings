import { PERMISSIONS } from "@/server/auth/permissions";

import type { IndustryTemplate } from "./types";

export const educationTemplate: IndustryTemplate = {
  key: "education",
  modules: ["students", "courses", "tasks"],
  nav: [
    { key: "dashboard" },
    { key: "students" },
    { key: "courses" },
    { key: "tasks" },
    { key: "settings" },
  ],
  widgets: [
    { key: "metrics" },
    { key: "recent-students", module: "students" },
    { key: "recent-tasks", module: "tasks" },
  ],
  customRoles: [
    {
      key: "instructor",
      name: "Instructor",
      description: "Teaches courses and tracks student progress",
      permissions: [
        PERMISSIONS.DASHBOARD_READ,
        PERMISSIONS.STUDENTS_READ,
        PERMISSIONS.COURSES_READ,
        PERMISSIONS.TASKS_READ,
        PERMISSIONS.TASKS_MANAGE,
      ],
    },
  ],
  rolePermissionExtras: {
    manager: [PERMISSIONS.STUDENTS_READ, PERMISSIONS.COURSES_READ],
    staff: [PERMISSIONS.STUDENTS_READ, PERMISSIONS.COURSES_READ],
    viewer: [PERMISSIONS.STUDENTS_READ, PERMISSIONS.COURSES_READ],
  },
};
