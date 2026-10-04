import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

import {
  checkSubscription,
  planCoversModule,
} from "@/server/billing/subscription";

import { getAuthContext, type AuthContext } from "./context";
import { AuthError } from "./errors";
import {
  hasPermission,
  isSuperAdmin,
  SYSTEM_ROLES,
  type PermissionKey,
} from "./permissions";

export interface OrganizationContext extends AuthContext {
  organization: NonNullable<AuthContext["organization"]>;
  membership: NonNullable<AuthContext["membership"]>;
  role: NonNullable<AuthContext["role"]>;
}

export async function requireAuth(
  ctx?: AuthContext | null,
): Promise<AuthContext> {
  const resolved = ctx === undefined ? await getAuthContext() : ctx;
  if (!resolved) {
    throw new AuthError("UNAUTHENTICATED");
  }
  return resolved;
}

export async function requireOrganization(
  ctx?: AuthContext | null,
): Promise<OrganizationContext> {
  const resolved = await requireAuth(ctx);
  if (!resolved.organization || !resolved.membership || !resolved.role) {
    throw new AuthError("NO_ORGANIZATION");
  }
  return resolved as OrganizationContext;
}

export async function requirePermission(
  permission: PermissionKey,
  ctx?: AuthContext | null,
): Promise<OrganizationContext> {
  const resolved = await requireOrganization(ctx);
  if (
    !hasPermission(resolved.role.key, resolved.permissions, permission)
  ) {
    throw new AuthError(
      "FORBIDDEN",
      `Missing permission: ${permission}`,
    );
  }
  return resolved;
}

export async function requireModule(
  moduleKey: string,
  ctx?: AuthContext | null,
): Promise<OrganizationContext> {
  const resolved = await requireOrganization(ctx);
  if (resolved.role.key === "super_admin") {
    return resolved;
  }
  if (!resolved.modules.includes(moduleKey)) {
    throw new AuthError(
      "MODULE_DISABLED",
      `Module not enabled: ${moduleKey}`,
    );
  }
  return resolved;
}

export async function requirePageAuth(): Promise<OrganizationContext> {
  const ctx = await getAuthContext();
  const locale = await getLocale();
  if (!ctx) {
    redirect({ href: "/signin", locale });
  }
  if (!ctx.organization || !ctx.membership || !ctx.role) {
    redirect({ href: "/signup", locale });
  }
  return ctx as OrganizationContext;
}

export async function requirePageSuperAdmin(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  const locale = await getLocale();
  if (!ctx) {
    redirect({ href: "/signin", locale });
  }
  if (!ctx.role || !isSuperAdmin(ctx.role.key)) {
    redirect({ href: "/no-access", locale });
  }
  return ctx;
}

export async function requirePageModule(
  moduleKey: string,
  permission: PermissionKey,
): Promise<OrganizationContext> {
  const ctx = await requirePageAuth();
  const locale = await getLocale();
  const allowed =
    ctx.role.key === SYSTEM_ROLES.SUPER_ADMIN ||
    (ctx.modules.includes(moduleKey) &&
      hasPermission(ctx.role.key, ctx.permissions, permission));
  if (!allowed) {
    redirect({ href: "/no-access", locale });
  }
  if (ctx.role.key !== SYSTEM_ROLES.SUPER_ADMIN) {
    const check = await checkSubscription(ctx, { persistTransitions: false });
    if (check.access === "none") {
      redirect({
        href: { pathname: "/billing", query: { reason: "subscription" } },
        locale,
      });
    }
    if (!planCoversModule(check, moduleKey)) {
      redirect({
        href: { pathname: "/billing", query: { reason: "module" } },
        locale,
      });
    }
  }
  return ctx;
}
