import type { AuthContext } from "./context";

export interface SessionPayload {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  organization: {
    id: string;
    slug: string;
    name: string;
    logo: string | null;
    favicon: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    templateKey: string;
  };
  role: { key: string; name: string };
  permissions: string[];
  modules: string[];
  subscription: {
    planCode: string;
    planName: string;
    state: string;
    currentPeriodEnd: string | null;
    trialEndsAt: string | null;
  } | null;
}

export function toSessionPayload(ctx: AuthContext): SessionPayload {
  if (!ctx.organization || !ctx.role) {
    throw new Error(
      "toSessionPayload requires an authenticated context with an organization.",
    );
  }
  return {
    user: {
      id: ctx.user.id,
      name: ctx.user.name,
      email: ctx.user.email,
      avatarUrl: ctx.user.avatarUrl,
    },
    organization: {
      id: ctx.organization.id,
      slug: ctx.organization.slug,
      name: ctx.organization.name,
      logo: ctx.organization.logo,
      favicon: ctx.organization.favicon,
      primaryColor: ctx.organization.primaryColor,
      secondaryColor: ctx.organization.secondaryColor,
      templateKey: ctx.organization.templateKey,
    },
    role: { key: ctx.role.key, name: ctx.role.name },
    permissions: ctx.permissions,
    modules: ctx.modules,
    subscription: ctx.subscription
      ? {
          planCode: String(ctx.subscription.plan.key),
          planName: ctx.subscription.plan.name,
          state: String(ctx.subscription.state),
          currentPeriodEnd: ctx.subscription.currentPeriodEnd
            ? ctx.subscription.currentPeriodEnd.toISOString()
            : null,
          trialEndsAt: ctx.subscription.trialEndsAt
            ? ctx.subscription.trialEndsAt.toISOString()
            : null,
        }
      : null,
  };
}
