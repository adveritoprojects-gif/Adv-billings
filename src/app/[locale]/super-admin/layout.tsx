import { requirePageSuperAdmin } from "@/server/auth/guards";
import { toSessionPayload } from "@/server/auth/payload";
import type { Metadata } from "next";
import SuperAdminShell from "./SuperAdminShell";

export async function generateMetadata(): Promise<Metadata> {
  await requirePageSuperAdmin();
  return {
    title: {
      default: "Super Admin",
      template: "%s | Super Admin",
    },
    icons: {
      icon: "/favicon.ico",
    },
  };
}

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requirePageSuperAdmin();

  return (
    <SuperAdminShell session={toSessionPayload(ctx)}>{children}</SuperAdminShell>
  );
}
