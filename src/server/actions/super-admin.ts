"use server";

import { getAuthContext } from "@/server/auth/context";
import { isSuperAdmin } from "@/server/auth/permissions";
import {
  SUPER_ADMIN_ERRORS,
  addMember,
  assignPlan,
  createOrganization,
  extendTrial,
  onboardOrganization,
  reactivateSubscription,
  removeMember,
  setModuleEnabled,
  setOrganizationStatus,
  startTrial,
  suspendSubscription,
  updateBranding,
  updateMemberRole,
  updateOrganization,
  type OnboardOrganizationResult,
  type SuperAdminActor,
} from "@/server/services/super-admin";
import type { SuperAdminActionResult } from "@/components/super-admin/types";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

async function runSuperAdmin<T extends SuperAdminActionResult>(
  fn: (actor: SuperAdminActor) => Promise<T>,
): Promise<T> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) {
      return { ok: false, errorKey: SUPER_ADMIN_ERRORS.unauthenticated } as T;
    }
    if (!ctx.role || !isSuperAdmin(ctx.role.key)) {
      return { ok: false, errorKey: SUPER_ADMIN_ERRORS.forbidden } as T;
    }
    const requestHeaders = await headers();
    const actor: SuperAdminActor = {
      userId: ctx.user.id,
      ip:
        requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: requestHeaders.get("user-agent"),
    };
    const result = await fn(actor);
    if (result.ok) {
      revalidatePath("/super-admin", "layout");
    }
    return result;
  } catch (error) {
    console.error("Super admin action failed:", error);
    return { ok: false, errorKey: SUPER_ADMIN_ERRORS.generic } as T;
  }
}

export async function createOrganizationAction(
  formData: FormData,
): Promise<SuperAdminActionResult> {
  return runSuperAdmin((actor) =>
    createOrganization(actor, {
      name: formData.get("name"),
      slug: formData.get("slug"),
      businessType: formData.get("businessType"),
      templateKey: formData.get("templateKey"),
      ownerName: formData.get("ownerName"),
      ownerEmail: formData.get("ownerEmail"),
      ownerPassword: formData.get("ownerPassword"),
    }),
  );
}

export async function onboardOrganizationAction(
  formData: FormData,
): Promise<OnboardOrganizationResult> {
  return runSuperAdmin((actor) =>
    onboardOrganization(actor, {
      name: formData.get("name"),
      slug: formData.get("slug"),
      businessType: formData.get("businessType"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      website: formData.get("website"),
      address: formData.get("address"),
      templateKey: formData.get("templateKey"),
      logo: formData.get("logo"),
      primaryColor: formData.get("primaryColor"),
      secondaryColor: formData.get("secondaryColor"),
      favicon: formData.get("favicon"),
      modules: formData.getAll("modules"),
      ownerName: formData.get("ownerName"),
      ownerEmail: formData.get("ownerEmail"),
      ownerPassword: formData.get("ownerPassword"),
      planKey: formData.get("planKey"),
    }),
  );
}

export async function updateOrganizationAction(
  organizationId: string,
  formData: FormData,
): Promise<SuperAdminActionResult> {
  return runSuperAdmin((actor) =>
    updateOrganization(actor, organizationId, {
      name: formData.get("name"),
      slug: formData.get("slug"),
      businessType: formData.get("businessType"),
      timezone: formData.get("timezone"),
      currency: formData.get("currency"),
      dateFormat: formData.get("dateFormat"),
    }),
  );
}

export async function updateBrandingAction(
  organizationId: string,
  formData: FormData,
): Promise<SuperAdminActionResult> {
  return runSuperAdmin((actor) =>
    updateBranding(actor, organizationId, {
      primaryColor: formData.get("primaryColor"),
      secondaryColor: formData.get("secondaryColor"),
      logo: formData.get("logo"),
      favicon: formData.get("favicon"),
    }),
  );
}

export async function setOrganizationStatusAction(
  organizationId: string,
  status: string,
): Promise<SuperAdminActionResult> {
  return runSuperAdmin((actor) =>
    setOrganizationStatus(actor, organizationId, status),
  );
}

export async function setModuleEnabledAction(
  organizationId: string,
  moduleKey: string,
  enabled: boolean,
): Promise<SuperAdminActionResult> {
  return runSuperAdmin((actor) =>
    setModuleEnabled(actor, organizationId, moduleKey, enabled),
  );
}

export async function assignPlanAction(
  organizationId: string,
  planKey: string,
): Promise<SuperAdminActionResult> {
  return runSuperAdmin((actor) => assignPlan(actor, organizationId, planKey));
}

export async function startTrialAction(
  organizationId: string,
  days: number,
): Promise<SuperAdminActionResult> {
  return runSuperAdmin((actor) => startTrial(actor, organizationId, days));
}

export async function extendTrialAction(
  organizationId: string,
  days: number,
): Promise<SuperAdminActionResult> {
  return runSuperAdmin((actor) => extendTrial(actor, organizationId, days));
}

export async function suspendSubscriptionAction(
  organizationId: string,
): Promise<SuperAdminActionResult> {
  return runSuperAdmin((actor) => suspendSubscription(actor, organizationId));
}

export async function reactivateSubscriptionAction(
  organizationId: string,
): Promise<SuperAdminActionResult> {
  return runSuperAdmin((actor) => reactivateSubscription(actor, organizationId));
}

export async function addMemberAction(
  organizationId: string,
  formData: FormData,
): Promise<SuperAdminActionResult> {
  return runSuperAdmin((actor) =>
    addMember(actor, organizationId, {
      email: formData.get("email"),
      name: formData.get("name"),
      password: formData.get("password"),
      roleKey: formData.get("roleKey"),
    }),
  );
}

export async function updateMemberRoleAction(
  organizationId: string,
  memberId: string,
  roleKey: string,
): Promise<SuperAdminActionResult> {
  return runSuperAdmin((actor) =>
    updateMemberRole(actor, organizationId, memberId, roleKey),
  );
}

export async function removeMemberAction(
  organizationId: string,
  memberId: string,
): Promise<SuperAdminActionResult> {
  return runSuperAdmin((actor) => removeMember(actor, organizationId, memberId));
}
