export interface SettingsActionResult {
  ok: boolean;
  errorKey?: string;
  id?: string;
}

export interface BusinessSettings {
  name: string;
  slug: string;
  businessType: string | null;
  currency: string | null;
  timezone: string | null;
  dateFormat: string | null;
}

export interface BrandingSettings {
  logo: string | null;
  favicon: string | null;
  loginLogo: string | null;
  loginBackground: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
}

export interface SettingsRoleOption {
  key: string;
  name: string;
  isSystem: boolean;
}

export interface SettingsMemberRow {
  id: string;
  userId: string;
  name: string;
  email: string;
  roleKey: string;
  roleName: string;
  status: string;
  joinedAt: Date;
}

export interface SettingsMembersData {
  members: SettingsMemberRow[];
  roleOptions: SettingsRoleOption[];
}

export interface SettingsPermissionItem {
  key: string;
  name: string;
  description: string;
  group: string;
}

export interface SettingsRoleRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  memberCount: number;
  permissions: string[];
}

export interface SettingsRolesData {
  roles: SettingsRoleRow[];
  permissionGroups: { group: string; permissions: SettingsPermissionItem[] }[];
}

export interface SettingsModuleRow {
  key: string;
  name: string;
  description: string | null;
  isCore: boolean;
  sortOrder: number;
  enabled: boolean;
}
