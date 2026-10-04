"use server";

import { redirect } from "@/i18n/navigation";
import { systemDb } from "@/server/db";
import { logActivity } from "@/server/services/activity";
import { createOrganizationWithOwner } from "@/server/services/organization";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";

import {
  createSessionRecord,
  deleteSessionByTokenHash,
  findSessionByTokenHash,
  findUserForAuthByEmail,
  listActiveMemberships,
  touchUserLogin,
} from "../auth/bootstrap";
import { hashPassword, verifyPassword } from "../auth/password";
import {
  clearAuthFailures,
  isAuthRateLimited,
  recordAuthFailure,
} from "../auth/rate-limit";
import { clearSessionCookie, readSessionCookie, setSessionCookie } from "../auth/session";
import {
  generateSessionToken,
  hashSessionToken,
  SESSION_MAX_AGE_DEFAULT,
  SESSION_MAX_AGE_REMEMBER,
} from "../auth/session-token";

export interface AuthActionState {
  errorKey?: string;
}

async function getRequestMeta() {
  const requestHeaders = await headers();
  return {
    ip:
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: requestHeaders.get("user-agent"),
  };
}

async function issueSession(input: {
  userId: string;
  organizationId: string;
  remember: boolean;
}) {
  const token = generateSessionToken();
  const maxAge = input.remember
    ? SESSION_MAX_AGE_REMEMBER
    : SESSION_MAX_AGE_DEFAULT;
  const meta = await getRequestMeta();

  await createSessionRecord({
    userId: input.userId,
    organizationId: input.organizationId,
    tokenHash: hashSessionToken(token),
    expiresAt: new Date(Date.now() + maxAge * 1000),
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  await setSessionCookie(token, input.remember);
  return meta;
}

interface SignInOutcome {
  errorKey?: string;
  redirectTo?: string;
}

async function runSignIn(formData: FormData): Promise<SignInOutcome> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "1";

  if (!email || !password) {
    return { errorKey: "signIn.required" };
  }

  const meta = await getRequestMeta();
  if (isAuthRateLimited(meta.ip, email)) {
    return { errorKey: "signIn.tooMany" };
  }

  const user = await findUserForAuthByEmail(email);
  if (!user) {
    recordAuthFailure(meta.ip, email);
    return { errorKey: "signIn.invalid" };
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    recordAuthFailure(meta.ip, email);
    return { errorKey: "signIn.invalid" };
  }
  if (user.status !== "ACTIVE") {
    recordAuthFailure(meta.ip, email);
    return { errorKey: "signIn.disabled" };
  }

  const memberships = await listActiveMemberships(user.id);
  if (memberships.length === 0) {
    clearAuthFailures(email);
    return { errorKey: "signIn.noOrganization" };
  }

  clearAuthFailures(email);
  const organizationId = memberships[0].organizationId;
  const issued = await issueSession({
    userId: user.id,
    organizationId,
    remember,
  });
  await touchUserLogin(user.id);
  await logActivity(organizationId, {
    action: "auth.sign_in",
    actorId: user.id,
    level: "AUDIT",
    ip: issued.ip,
    userAgent: issued.userAgent,
  });

  const redirectTo =
    memberships[0].role.key === "super_admin" ? "/super-admin" : "/";
  return { redirectTo };
}

async function runSignUp(formData: FormData): Promise<string | null> {
  const firstName = String(formData.get("fname") ?? "").trim();
  const lastName = String(formData.get("lname") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const organizationName = String(formData.get("orgName") ?? "").trim();
  const remember = formData.get("remember") !== "0";
  const acceptedTerms = formData.get("terms") === "1";

  if (!firstName || !lastName || !email || !password || !organizationName) {
    return "signUp.missingFields";
  }
  if (password.length < 8) {
    return "signUp.weakPassword";
  }
  if (!acceptedTerms) {
    return "signUp.termsRequired";
  }

  const requestMeta = await getRequestMeta();
  if (isAuthRateLimited(requestMeta.ip, email)) {
    return "signUp.tooMany";
  }

  const existingUser = await findUserForAuthByEmail(email);
  if (existingUser) {
    recordAuthFailure(requestMeta.ip, email);
    return "signUp.emailTaken";
  }

  const passwordHash = await hashPassword(password);

  let user;
  try {
    user = await systemDb.user.create({
      data: {
        name: `${firstName} ${lastName}`.trim(),
        email: email.toLowerCase(),
        passwordHash,
        status: "ACTIVE",
      },
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return "signUp.emailTaken";
    }
    throw error;
  }

  let organization;
  try {
    organization = await createOrganizationWithOwner({
      name: organizationName,
      ownerId: user.id,
    });
  } catch (error) {
    await systemDb.user
      .delete({ where: { id: user.id } })
      .catch(() => undefined);
    throw error;
  }

  clearAuthFailures(email);
  const meta = await issueSession({
    userId: user.id,
    organizationId: organization.id,
    remember,
  });
  await logActivity(organization.id, {
    action: "auth.sign_up",
    actorId: user.id,
    level: "AUDIT",
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return null;
}

export async function signIn(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  let outcome: SignInOutcome;
  try {
    outcome = await runSignIn(formData);
  } catch (error) {
    console.error("signIn failed:", error);
    return { errorKey: "signIn.error" };
  }
  if (outcome.errorKey) {
    return { errorKey: outcome.errorKey };
  }
  redirect({ href: outcome.redirectTo ?? "/", locale: await getLocale() });
}

export async function signUp(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  try {
    const errorKey = await runSignUp(formData);
    if (errorKey) {
      return { errorKey };
    }
  } catch (error) {
    console.error("signUp failed:", error);
    return { errorKey: "signUp.error" };
  }
  redirect({ href: "/", locale: await getLocale() });
}

export async function signOut(): Promise<void> {
  const token = await readSessionCookie();
  if (token) {
    const tokenHash = hashSessionToken(token);
    const session = await findSessionByTokenHash(tokenHash);
    if (session?.organizationId) {
      await logActivity(session.organizationId, {
        action: "auth.sign_out",
        actorId: session.userId,
        level: "AUDIT",
      });
    }
    await deleteSessionByTokenHash(tokenHash);
  }
  await clearSessionCookie();
}
