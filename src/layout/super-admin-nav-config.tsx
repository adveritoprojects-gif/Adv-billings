import { BoxCubeIcon, GridIcon, PlusIcon, TimeIcon } from "@/icons";

export interface SuperAdminNavItem {
  key: string;
  path: string;
  icon: React.ReactNode;
}

export const superAdminNavItems: SuperAdminNavItem[] = [
  {
    key: "dashboard",
    path: "/super-admin",
    icon: <GridIcon />,
  },
  {
    key: "organizations",
    path: "/super-admin/organizations",
    icon: <BoxCubeIcon />,
  },
  {
    key: "onboarding",
    path: "/super-admin/onboarding",
    icon: <PlusIcon />,
  },
  {
    key: "auditLog",
    path: "/super-admin/audit-log",
    icon: <TimeIcon />,
  },
];
