import { requirePageAuth } from "@/server/auth/guards";
import { toSessionPayload } from "@/server/auth/payload";
import { buildBrandVars } from "@/utils/branding";
import type { Metadata } from "next";
import AdminShell from "./AdminShell";

export async function generateMetadata(): Promise<Metadata> {
  const ctx = await requirePageAuth();
  return {
    title: {
      default: `${ctx.organization.name} | Dashboard`,
      template: `%s | ${ctx.organization.name}`,
    },
    icons: {
      icon: ctx.organization.favicon ?? "/favicon.ico",
    },
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
