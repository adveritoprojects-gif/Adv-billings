"use server";

import {
  clearAuthFailures,
  isAuthRateLimited,
  recordAuthFailure,
} from "@/server/auth/rate-limit";
import {
  acceptInvitation,
  MIN_INVITATION_PASSWORD_LENGTH,
} from "@/server/services/invitations";
import { redirect } from "@/i18n/navigation";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";

export interface AcceptInvitationState {
  errorKey?: string;
}

const INVALID_TOKEN_REASONS = new Set(["invalid", "expired", "revoked", "consumed"]);

async function getRequestMeta() {
  const requestHeaders = await headers();
  return {
    ip: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  };
}

export async function acceptInvitationAction(
  _prevState: AcceptInvitationState,
  formData: FormData,
): Promise<AcceptInvitationState> {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) {
    return { errorKey: "invalid" };
  }

  const { ip } = await getRequestMeta();
  const rateKey = `accept:${createHash("sha256").update(token).digest("hex").slice(0, 16)}`;
  if (isAuthRateLimited(ip, rateKey)) {
    return { errorKey: "rateLimited" };
  }

  if (password !== confirmPassword) {
    return { errorKey: "passwordMismatch" };
  }
  if (
    password.length > 0 &&
    password.length < MIN_INVITATION_PASSWORD_LENGTH
  ) {
    return { errorKey: "passwordWeak" };
  }

  let succeeded = false;
  let failureKey: string | null = null;

  try {
    const result = await acceptInvitation(token, password || undefined);
    if (result.ok) {
      succeeded = true;
      clearAuthFailures(rateKey);
    } else if (INVALID_TOKEN_REASONS.has(result.reason)) {
      recordAuthFailure(ip, rateKey);
      failureKey = result.reason;
    } else {
      failureKey = result.reason === "passwordWeak" ? "passwordWeak" : "invalid";
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("accept invitation failed", { error: message });
    failureKey = "generic";
  }

  if (succeeded) {
    redirect({ href: "/signin", locale: await getLocale() });
  }

  return { errorKey: failureKey ?? "generic" };
}
