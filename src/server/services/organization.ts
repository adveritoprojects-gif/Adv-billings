import { systemDb } from "@/server/db";
import { logActivity } from "@/server/services/activity";
import type { Organization } from "@prisma/client";
import { randomBytes } from "node:crypto";

export interface CreateOrganizationInput {
  name: string;
  ownerId: string;
  businessType?: string | null;
  timezone?: string | null;
  currency?: string | null;
  slug?: string | null;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function uniqueSlug(base: string): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate =
      attempt === 0
        ? base
        : `${base}-${randomBytes(3).toString("hex")}`;
    const existing = await systemDb.organization.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) {
      return candidate;
    }
  }
  throw new Error(`Could not allocate a unique slug for "${base}"`);
}

function nextPeriodEnd(interval: string, from: Date): Date {
  const end = new Date(from);
  if (interval === "YEAR") {
    end.setUTCFullYear(end.getUTCFullYear() + 1);
  } else {
    end.setUTCMonth(end.getUTCMonth() + 1);
  }
  return end;
}

export async function createOrganizationWithOwner(
  input: CreateOrganizationInput,
): Promise<Organization> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Organization name is required.");
  }

  const slug = await uniqueSlug(slugify(input.slug ?? name) || "org");

  const [ownerRole, plans, modules] = await Promise.all([
    systemDb.role.findFirst({
      where: { organizationId: null, key: "owner", isSystem: true },
    }),
    systemDb.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    systemDb.module.findMany({
      orderBy: [{ isCore: "desc" }, { sortOrder: "asc" }],
    }),
  ]);

  if (!ownerRole) {
    throw new Error(
      'System role "owner" not found. Run "npm run db:seed" first.',
    );
  }

  const organization = await systemDb.organization.create({
    data: {
      name,
      slug,
      businessType: input.businessType ?? null,
      timezone: input.timezone ?? "UTC",
      currency: input.currency ?? "USD",
      status: "ACTIVE",
    },
  });

  try {
    await systemDb.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: input.ownerId,
        roleId: ownerRole.id,
        status: "ACTIVE",
      },
    });

    if (modules.length > 0) {
      await systemDb.organizationModule.createMany({
        data: modules.map((module) => ({
          organizationId: organization.id,
          moduleId: module.id,
          enabled: module.isCore,
          enabledAt: module.isCore ? new Date() : null,
        })),
        skipDuplicates: true,
      });
    }

    const defaultPlan = plans[0] ?? null;
    if (defaultPlan) {
      const now = new Date();
      const state = defaultPlan.trialDays > 0 ? "TRIAL" : "ACTIVE";
      const trialEndsAt =
        defaultPlan.trialDays > 0
          ? new Date(
              now.getTime() + defaultPlan.trialDays * 24 * 60 * 60 * 1000,
            )
          : null;
      const subscription = await systemDb.subscription.create({
        data: {
          organizationId: organization.id,
          planId: defaultPlan.id,
          state,
          trialEndsAt,
          currentPeriodStart: now,
          currentPeriodEnd: trialEndsAt ?? nextPeriodEnd(defaultPlan.interval, now),
        },
      });
      await systemDb.subscriptionEvent.create({
        data: {
          organizationId: organization.id,
          subscriptionId: subscription.id,
          type: "CREATED",
          toState: state,
          planKey: defaultPlan.key,
          actorId: input.ownerId,
        },
      });
    }

    await logActivity(organization.id, {
      action: "org.created",
      actorId: input.ownerId,
      entity: "organization",
      entityId: organization.id,
      level: "AUDIT",
      metadata: { slug: organization.slug },
    });
  } catch (error) {
    await systemDb.organization
      .delete({ where: { id: organization.id } })
      .catch(() => undefined);
    throw error;
  }

  return organization;
}
