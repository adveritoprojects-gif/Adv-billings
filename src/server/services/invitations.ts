import { createHash, randomBytes } from "node:crypto";
import { hashPassword } from "@/server/auth/password";
import { systemDb } from "@/server/db";
import { sendEmail } from "@/server/email/smtp";
import { buildInvitationEmail } from "@/server/email/templates/invitation";

export const INVITATION_TTL_HOURS = 72;
export const INVITATION_TTL_MS = INVITATION_TTL_HOURS * 60 * 60 * 1000;
export const MIN_INVITATION_PASSWORD_LENGTH = 8;

export type InvitationState =
  | "valid"
  | "invalid"
  | "expired"
  | "revoked"
  | "consumed";

export type InvitationPreview =
  | {
      status: "valid";
      setsPassword: boolean;
      ownerName: string;
      organizationName: string;
      expiresAt: Date;
    }
  | { status: Exclude<InvitationState, "valid"> };

export type AcceptInvitationResult =
  | { ok: true; organizationSlug: string }
  | { ok: false; reason: Exclude<InvitationState, "valid"> | "passwordWeak" };

export type ResendInvitationResult =
  | { ok: true }
  | {
      ok: false;
      reason: "notFound" | "alreadyAccepted" | "inviteFailed";
    };

export function getAppUrl(): string {
  const raw =
    process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) {
    throw new Error(
      "APP_URL is not set. It must be the absolute public URL of the app.",
    );
  }
  if (!/^https?:\/\//i.test(raw)) {
    throw new Error("APP_URL must be an absolute http(s) URL.");
  }
  return raw.replace(/\/+$/, "");
}

function hashInvitationToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export async function createUnusablePasswordHash(): Promise<string> {
  return hashPassword(randomBytes(24).toString("base64url"));
}

function isTokenShaped(rawToken: string): boolean {
  return rawToken.length >= 20 && rawToken.length <= 200;
}

const RESEND_WINDOW_MS = 15 * 60 * 1000;
const RESEND_MAX_ATTEMPTS = 5;

const globalForInviteRateLimit = globalThis as unknown as {
  __invitationResendLimit?: Map<string, { count: number; resetAt: number }>;
};

const resendStore: Map<string, { count: number; resetAt: number }> =
  globalForInviteRateLimit.__invitationResendLimit ?? new Map();
globalForInviteRateLimit.__invitationResendLimit = resendStore;

export function isResendRateLimited(organizationId: string): boolean {
  const now = Date.now();
  const key = `resend:${organizationId}`;
  const entry = resendStore.get(key);
  if (!entry) {
    return false;
  }
  if (entry.resetAt <= now) {
    resendStore.delete(key);
    return false;
  }
  return entry.count >= RESEND_MAX_ATTEMPTS;
}

export function recordResendAttempt(organizationId: string): void {
  const now = Date.now();
  const key = `resend:${organizationId}`;
  const entry = resendStore.get(key);
  if (!entry || entry.resetAt <= now) {
    resendStore.set(key, { count: 1, resetAt: now + RESEND_WINDOW_MS });
    if (resendStore.size > 1000) {
      for (const [staleKey, stale] of resendStore) {
        if (stale.resetAt <= now) {
          resendStore.delete(staleKey);
        }
      }
    }
    return;
  }
  entry.count += 1;
}

export async function issueInvitation(input: {
  userId: string;
  organizationId: string;
  invitedById?: string | null;
}): Promise<{ rawToken: string; expiresAt: Date }> {
  const user = await systemDb.user.findUnique({
    where: { id: input.userId },
    select: { email: true },
  });
  if (!user) {
    throw new Error("Cannot issue an invitation for an unknown user.");
  }

  await systemDb.invitation.updateMany({
    where: {
      userId: input.userId,
      organizationId: input.organizationId,
      consumedAt: null,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

  await systemDb.invitation.create({
    data: {
      tokenHash: hashInvitationToken(rawToken),
      userId: input.userId,
      organizationId: input.organizationId,
      email: user.email,
      expiresAt,
      invitedById: input.invitedById ?? null,
    },
  });

  return { rawToken, expiresAt };
}

export async function getInvitationPreview(
  rawToken: string,
): Promise<InvitationPreview> {
  if (!isTokenShaped(rawToken)) {
    return { status: "invalid" };
  }
  const invitation = await systemDb.invitation.findUnique({
    where: { tokenHash: hashInvitationToken(rawToken) },
    include: {
      user: { select: { name: true, status: true } },
      organization: { select: { name: true } },
    },
  });
  if (!invitation) {
    return { status: "invalid" };
  }
  if (invitation.consumedAt) {
    return { status: "consumed" };
  }
  if (invitation.revokedAt) {
    return { status: "revoked" };
  }
  if (invitation.expiresAt.getTime() <= Date.now()) {
    return { status: "expired" };
  }
  return {
    status: "valid",
    setsPassword: invitation.user.status !== "ACTIVE",
    ownerName: invitation.user.name,
    organizationName: invitation.organization.name,
    expiresAt: invitation.expiresAt,
  };
}

export async function acceptInvitation(
  rawToken: string,
  password?: string,
): Promise<AcceptInvitationResult> {
  const preview = await getInvitationPreview(rawToken);
  if (preview.status !== "valid") {
    return { ok: false, reason: preview.status };
  }

  const tokenHash = hashInvitationToken(rawToken);
  const invitation = await systemDb.invitation.findUnique({
    where: { tokenHash },
    include: {
      user: { select: { id: true, status: true } },
      organization: { select: { id: true, slug: true } },
    },
  });
  if (!invitation) {
    return { ok: false, reason: "invalid" };
  }

  const membership = await systemDb.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: invitation.organizationId,
        userId: invitation.userId,
      },
    },
    select: { id: true },
  });
  if (!membership) {
    return { ok: false, reason: "invalid" };
  }

  const needsPassword = invitation.user.status !== "ACTIVE";
  if (
    needsPassword &&
    (!password || password.length < MIN_INVITATION_PASSWORD_LENGTH)
  ) {
    return { ok: false, reason: "passwordWeak" };
  }

  const now = new Date();
  const passwordHash = needsPassword
    ? await hashPassword(password as string)
    : null;

  await systemDb.$transaction([
    ...(passwordHash
      ? [
          systemDb.user.update({
            where: { id: invitation.userId },
            data: {
              passwordHash,
              status: "ACTIVE",
              emailVerified: now,
            },
          }),
        ]
      : []),
    systemDb.organizationMember.update({
      where: { id: membership.id },
      data: { status: "ACTIVE" },
    }),
    systemDb.invitation.update({
      where: { id: invitation.id },
      data: { consumedAt: now },
    }),
    systemDb.invitation.updateMany({
      where: {
        userId: invitation.userId,
        organizationId: invitation.organizationId,
        id: { not: invitation.id },
        consumedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: now },
    }),
  ]);

  return { ok: true, organizationSlug: invitation.organization.slug };
}

function absoluteAssetUrl(pathname: string | null): string | null {
  if (!pathname) return null;
  if (/^https?:\/\//i.test(pathname)) return pathname;
  if (!pathname.startsWith("/")) return null;
  return `${getAppUrl()}${pathname}`;
}

export async function sendInvitationEmail(params: {
  userId: string;
  organizationId: string;
  rawToken: string;
  expiresAt: Date;
}): Promise<void> {
  const [user, organization] = await Promise.all([
    systemDb.user.findUnique({
      where: { id: params.userId },
      select: { email: true, name: true },
    }),
    systemDb.organization.findUnique({
      where: { id: params.organizationId },
      select: {
        name: true,
        primaryColor: true,
        logo: true,
        loginLogo: true,
      },
    }),
  ]);
  if (!user || !organization) {
    throw new Error("Cannot send an invitation for an unknown recipient.");
  }

  const supportEmail = process.env.EMAIL_USER?.trim();
  if (!supportEmail) {
    throw new Error("EMAIL_USER is not set; it is used as the support address.");
  }

  const activationUrl = `${getAppUrl()}/accept-invitation?token=${encodeURIComponent(params.rawToken)}`;
  const email = buildInvitationEmail({
    ownerName: user.name,
    organizationName: organization.name,
    activationUrl,
    expiresAt: params.expiresAt,
    supportEmail,
    primaryColor: organization.primaryColor,
    logoUrl: absoluteAssetUrl(
      organization.loginLogo ?? organization.logo,
    ),
    recipientEmail: user.email,
  });

  await sendEmail({
    to: user.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}

export async function inviteOrganizationOwner(params: {
  userId: string;
  organizationId: string;
  invitedById: string;
}): Promise<{ sent: boolean }> {
  try {
    const { rawToken, expiresAt } = await issueInvitation(params);
    await sendInvitationEmail({
      userId: params.userId,
      organizationId: params.organizationId,
      rawToken,
      expiresAt,
    });
    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("invitation email delivery failed", {
      organizationId: params.organizationId,
      error: message,
    });
    return { sent: false };
  }
}

export async function resendInvitation(input: {
  organizationId: string;
  invitedById: string;
}): Promise<ResendInvitationResult> {
  const organization = await systemDb.organization.findUnique({
    where: { id: input.organizationId },
    select: { id: true },
  });
  if (!organization) {
    return { ok: false, reason: "notFound" };
  }

  const latest = await systemDb.invitation.findFirst({
    where: { organizationId: input.organizationId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true } } },
  });

  let userId = latest?.user.id ?? null;
  if (!userId) {
    const pendingMember = await systemDb.organizationMember.findFirst({
      where: { organizationId: input.organizationId, status: "INVITED" },
      select: { userId: true },
    });
    userId = pendingMember?.userId ?? null;
  }
  if (!userId) {
    const ownerRole = await systemDb.role.findFirst({
      where: { organizationId: null, key: "owner", isSystem: true },
      select: { id: true },
    });
    const ownerMember = ownerRole
      ? await systemDb.organizationMember.findFirst({
          where: {
            organizationId: input.organizationId,
            roleId: ownerRole.id,
            status: "ACTIVE",
          },
          select: { userId: true },
        })
      : null;
    userId = ownerMember?.userId ?? null;
  }
  if (!userId) {
    return { ok: false, reason: "notFound" };
  }

  const membership = await systemDb.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId,
      },
    },
    select: { status: true },
  });
  const target = await systemDb.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });
  if (!membership || !target) {
    return { ok: false, reason: "notFound" };
  }
  if (membership.status === "ACTIVE" && target.status === "ACTIVE") {
    return { ok: false, reason: "alreadyAccepted" };
  }

  return inviteOrganizationOwner({
    userId,
    organizationId: input.organizationId,
    invitedById: input.invitedById,
  }).then(({ sent }) =>
    sent ? ({ ok: true } as const) : ({ ok: false, reason: "inviteFailed" } as const),
  );
}
