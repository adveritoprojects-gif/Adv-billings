import { tenantEnforcementExtension } from "./tenant-extension";

import { systemDb } from "./client";

const enforced = systemDb.$extends(tenantEnforcementExtension());

export const db = enforced;

export { systemDb };
export {
  getTenantScope,
  orgScope,
  TenantScopeError,
  withSystem,
  withTenant,
} from "./tenant";
export { TENANT_MODELS } from "./tenant-extension";
