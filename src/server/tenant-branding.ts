import { systemDb } from "@/server/db";
import {
  DEFAULT_BRANDING,
  resolveTenantBranding,
  type TenantBranding,
} from "@/utils/branding";

const SLUG_PATTERN = /^[a-z0-9-]{1,60}$/;

const RESERVED_HOST_LABELS = new Set([
  "localhost",
  "www",
  "app",
  "admin",
  "api",
  "mail",
  "127",
]);

function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value) && !RESERVED_HOST_LABELS.has(value);
}

function hostLabel(host: string | null | undefined): string | null {
  if (!host) {
    return null;
  }
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  if (!hostname.includes(".")) {
    return null;
  }
  const label = hostname.split(".")[0] ?? "";
  return isValidSlug(label) ? label : null;
}

async function findOrganizationBySlug(slug: string) {
  return systemDb.organization.findFirst({
    where: { slug, status: "ACTIVE", isPlatform: false },
    select: {
      name: true,
      logo: true,
      favicon: true,
      loginLogo: true,
      loginBackground: true,
      primaryColor: true,
      secondaryColor: true,
    },
  });
}

export async function lookupTenantBranding(params: {
  org?: string | null;
  host?: string | null;
}): Promise<TenantBranding> {
  const candidates: string[] = [];
  const orgSlug = params.org?.trim().toLowerCase();
  if (orgSlug && isValidSlug(orgSlug)) {
    candidates.push(orgSlug);
  }
  const subdomain = hostLabel(params.host);
  if (subdomain) {
    candidates.push(subdomain);
  }

  for (const slug of candidates) {
    const organization = await findOrganizationBySlug(slug);
    if (organization) {
      return resolveTenantBranding(organization);
    }
  }

  return DEFAULT_BRANDING;
}
