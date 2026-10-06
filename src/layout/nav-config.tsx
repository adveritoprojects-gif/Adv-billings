import {
  BoxCubeIcon,
  BoxIcon,
  CalenderIcon,
  ChatIcon,
  DocsIcon,
  DollarLineIcon,
  FolderIcon,
  GridIcon,
  GroupIcon,
  ListIcon,
  PieChartIcon,
  SettingsIcon,
  TableIcon,
  TaskIcon,
  UserCircleIcon,
  UserIcon,
} from "@/icons";
import { PERMISSIONS, type PermissionKey } from "@/server/auth/permissions";

export interface NavChild {
  key: string;
  path: string;
  module?: string;
  permission?: PermissionKey;
  new?: boolean;
  target?: string;
}

export interface NavItem {
  key: string;
  icon: React.ReactNode;
  path?: string;
  module?: string;
  permission?: PermissionKey;
  new?: boolean;
  target?: string;
  templateOnly?: boolean;
  subItems?: NavChild[];
}

export const mainNavItems: NavItem[] = [
  {
    key: "dashboard",
    icon: <GridIcon />,
    path: "/dashboard",
    module: "dashboard",
    permission: PERMISSIONS.DASHBOARD_READ,
  },
  {
    key: "crm",
    icon: <ChatIcon />,
    module: "crm",
    permission: PERMISSIONS.CRM_READ,
    subItems: [
      {
        key: "overview",
        path: "/crm",
        module: "crm",
        permission: PERMISSIONS.CRM_READ,
      },
      {
        key: "leads",
        path: "/crm/leads",
        module: "crm",
        permission: PERMISSIONS.LEADS_READ,
      },
      {
        key: "contacts",
        path: "/crm/contacts",
        module: "crm",
        permission: PERMISSIONS.CONTACTS_READ,
      },
      {
        key: "customers",
        path: "/crm/customers",
        module: "crm",
        permission: PERMISSIONS.CUSTOMERS_READ,
      },
      {
        key: "companies",
        path: "/crm/companies",
        module: "crm",
        permission: PERMISSIONS.COMPANIES_READ,
      },
      {
        key: "activities",
        path: "/crm/activities",
        module: "crm",
        permission: PERMISSIONS.ACTIVITIES_READ,
      },
      {
        key: "tasks",
        path: "/crm/tasks",
        module: "crm",
        permission: PERMISSIONS.TASKS_READ,
      },
    ],
  },
  {
    key: "sales",
    icon: <DollarLineIcon />,
    module: "sales",
    permission: PERMISSIONS.SALES_READ,
    subItems: [
      {
        key: "deals",
        path: "/sales/deals",
        module: "sales",
        permission: PERMISSIONS.DEALS_READ,
      },
    ],
  },
  {
    key: "tasks",
    icon: <TaskIcon />,
    path: "/tasks",
    module: "tasks",
    permission: PERMISSIONS.TASKS_READ,
  },
  {
    key: "projects",
    icon: <FolderIcon />,
    path: "/projects",
    module: "projects",
    permission: PERMISSIONS.PROJECTS_READ,
  },
  {
    key: "products",
    icon: <BoxIcon />,
    path: "/products",
    module: "products",
    permission: PERMISSIONS.PRODUCTS_READ,
  },
  {
    key: "inventory",
    icon: <TableIcon />,
    path: "/inventory",
    module: "inventory",
    permission: PERMISSIONS.INVENTORY_READ,
  },
  {
    key: "orders",
    icon: <ListIcon />,
    path: "/orders",
    module: "orders",
    permission: PERMISSIONS.ORDERS_READ,
  },
  {
    key: "suppliers",
    icon: <GroupIcon />,
    path: "/suppliers",
    module: "suppliers",
    permission: PERMISSIONS.SUPPLIERS_READ,
  },
  {
    key: "students",
    icon: <UserIcon />,
    path: "/students",
    module: "students",
    permission: PERMISSIONS.STUDENTS_READ,
  },
  {
    key: "courses",
    icon: <DocsIcon />,
    path: "/courses",
    module: "courses",
    permission: PERMISSIONS.COURSES_READ,
  },
  {
    key: "staff",
    icon: <UserCircleIcon />,
    path: "/settings/users",
    module: "settings",
    permission: PERMISSIONS.MEMBERS_READ,
    templateOnly: true,
  },
  {
    key: "finance",
    icon: <BoxCubeIcon />,
    module: "finance",
    permission: PERMISSIONS.FINANCE_READ,
    subItems: [
      {
        key: "invoices",
        path: "/finance/invoices",
        module: "finance",
        permission: PERMISSIONS.INVOICES_READ,
      },
      {
        key: "expenses",
        path: "/finance/expenses",
        module: "finance",
        permission: PERMISSIONS.EXPENSES_READ,
      },
    ],
  },
  {
    key: "reports",
    icon: <PieChartIcon />,
    path: "/reports",
    module: "reports",
    permission: PERMISSIONS.REPORTS_READ,
  },
  {
    key: "settings",
    icon: <SettingsIcon />,
    path: "/settings",
    module: "settings",
    permission: PERMISSIONS.SETTINGS_READ,
    subItems: [
      {
        key: "overview",
        path: "/settings",
        module: "settings",
        permission: PERMISSIONS.SETTINGS_READ,
      },
      {
        key: "business",
        path: "/settings/business",
        module: "settings",
        permission: PERMISSIONS.SETTINGS_READ,
      },
      {
        key: "branding",
        path: "/settings/branding",
        module: "settings",
        permission: PERMISSIONS.SETTINGS_READ,
      },
      {
        key: "users",
        path: "/settings/users",
        module: "settings",
        permission: PERMISSIONS.MEMBERS_READ,
      },
      {
        key: "roles",
        path: "/settings/roles",
        module: "settings",
        permission: PERMISSIONS.ROLES_READ,
      },
      {
        key: "modules",
        path: "/settings/modules",
        module: "settings",
        permission: PERMISSIONS.MODULES_READ,
      },
    ],
  },
];

export const otherNavItems: NavItem[] = [
  {
    key: "calendar",
    icon: <CalenderIcon />,
    path: "/calendar",
  },
  {
    key: "userProfile",
    icon: <UserCircleIcon />,
    path: "/profile",
  },
];
