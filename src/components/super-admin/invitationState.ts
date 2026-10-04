export type InvitationState =
  | "pending"
  | "accepted"
  | "expired"
  | "revoked"
  | "none";

interface InvitationSnapshot {
  consumedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
}

export function resolveInvitationState(params: {
  invitation: InvitationSnapshot | null;
  ownerAccepted: boolean;
}): InvitationState {
  const { invitation, ownerAccepted } = params;
  if (ownerAccepted || invitation?.consumedAt) {
    return "accepted";
  }
  if (!invitation) {
    return "none";
  }
  if (invitation.revokedAt) {
    return "revoked";
  }
  if (invitation.expiresAt.getTime() <= Date.now()) {
    return "expired";
  }
  return "pending";
}
