import { requirePageAuth } from "@/server/auth/guards";
import { toSessionPayload } from "@/server/auth/payload";
import { buildBrandVars, PRODUCT_NAME } from "@/utils/branding";
import type { Metadata } from "next";
import AdminShell from "./AdminShell";

export async function generateMetadata(): Promise<Metadata> {
  const ctx = await requirePageAuth();
  const tenantFavicon = ctx.organization.favicon;
  return {
    title: {
      default: `${PRODUCT_NAME} | Dashboard`,
      template: `%s | ${PRODUCT_NAME}`,
    },
    description: `${PRODUCT_NAME} — Business management, CRM and operations platform.`,
    ...(tenantFavicon ? { icons: { icon: tenantFavicon } } : {}),
  };
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requirePageAuth();
  const brandVars = buildBrandVars(
    ctx.organization.primaryColor,
    ctx.organization.secondaryColor,
  );

  return (
    <AdminShell session={toSessionPayload(ctx)} brandVars={brandVars}>
      {children}
    </AdminShell>
  );
}
