"use server";

import { AuthError } from "@/server/auth/errors";
import {
  requireOrganization,
  type OrganizationContext,
} from "@/server/auth/guards";
import { revalidatePath } from "next/cache";

import type { SettingsActionResult } from "@/components/settings/types";
import {
  SETTINGS_ERRORS,
  addSettingMember,
  changeSettingMemberRole,
  createSettingRole,
  deleteSettingRole,
  removeSettingMember,
  setSettingModuleEnabled,
  updateBranding,
  updateBusiness,
  updateSettingRole,
} from "@/server/services/settings";

function str(value: FormDataEntryValue | null, max = 500): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, max);
}

function bool(value: FormDataEntryValue | null): boolean {
  return value === "1" || value === "true";
}

async function runSettings(
  fn: (ctx: OrganizationContext) => Promise<SettingsActionResult>,
): Promise<SettingsActionResult> {
  try {
    const ctx = await requireOrganization();
    const result = await fn(ctx);
    if (result.ok) {
      revalidatePath("/", "layout");
    }
    return result;
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, errorKey: SETTINGS_ERRORS.forbidden };
    }
    console.error("Settings action failed:", error);
    return { ok: false, errorKey: SETTINGS_ERRORS.generic };
  }
}

export async function updateBusinessAction(
  _prevState: SettingsActionResult,
  formData: FormData,
): Promise<SettingsActionResult> {
  return runSettings((ctx) =>
    updateBusiness(ctx, {
      name: str(formData.get("name"), 120),
      businessType: str(formData.get("businessType"), 80),
      currency: str(formData.get("currency"), 8),
      timezone: str(formData.get("timezone"), 64),
      dateFormat: str(formData.get("dateFormat"), 40),
    }),
  );
}

export async function updateBrandingAction(
  _prevState: SettingsActionResult,
  formData: FormData,
): Promise<SettingsActionResult> {
  return runSettings((ctx) => {
    const clearField = str(formData.get("clearField"), 40);
    const value = (field: string): string =>
      clearField === field ? "" : str(formData.get(field));
    return updateBranding(ctx, {
      logo: value("logo"),
      favicon: value("favicon"),
      loginLogo: value("loginLogo"),
      loginBackground: value("loginBackground"),
      primaryColor: value("primaryColor"),
      secondaryColor: value("secondaryColor"),
    });
  });
}

export async function addMemberAction(
  formData: FormData,
): Promise<SettingsActionResult> {
  return runSettings((ctx) =>
    addSettingMember(ctx, {
      name: str(formData.get("name"), 120),
      email: str(formData.get("email"), 200),
      password: str(formData.get("password"), 200),
      roleKey: str(formData.get("roleKey"), 40),
    }),
  );
}

export async function changeMemberRoleAction(
  formData: FormData,
): Promise<SettingsActionResult> {
  return runSettings((ctx) =>
    changeSettingMemberRole(
      ctx,
      str(formData.get("memberId"), 60),
      str(formData.get("roleKey"), 40),
    ),
  );
}

export async function removeMemberAction(
  formData: FormData,
): Promise<SettingsActionResult> {
  return runSettings((ctx) =>
    removeSettingMember(ctx, str(formData.get("memberId"), 60)),
  );
}

export async function createRoleAction(
  formData: FormData,
): Promise<SettingsActionResult> {
  return runSettings((ctx) =>
    createSettingRole(ctx, {
      name: str(formData.get("name"), 80),
      key: str(formData.get("key"), 40),
      permissionKeys: formData
        .getAll("permissionKeys")
        .map((value) => str(value, 64)),
    }),
  );
}

export async function updateRoleAction(
  formData: FormData,
): Promise<SettingsActionResult> {
  return runSettings((ctx) =>
    updateSettingRole(ctx, str(formData.get("roleId"), 60), {
      name: str(formData.get("name"), 80),
      permissionKeys: formData
        .getAll("permissionKeys")
        .map((value) => str(value, 64)),
    }),
  );
}

export async function deleteRoleAction(
  formData: FormData,
): Promise<SettingsActionResult> {
  return runSettings((ctx) =>
    deleteSettingRole(ctx, str(formData.get("roleId"), 60)),
  );
}

export async function setModuleEnabledAction(
  formData: FormData,
): Promise<SettingsActionResult> {
  return runSettings((ctx) =>
    setSettingModuleEnabled(
      ctx,
      str(formData.get("moduleKey"), 40),
      bool(formData.get("enabled")),
    ),
  );
}
