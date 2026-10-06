import { requirePageSuperAdmin } from "@/server/auth/guards";
import { toSessionPayload } from "@/server/auth/payload";
import { PRODUCT_NAME } from "@/utils/branding";
import type { Metadata } from "next";
import SuperAdminShell from "./SuperAdminShell";

export async function generateMetadata(): Promise<Metadata> {
  await requirePageSuperAdmin();
  return {
    title: {
      default: `${PRODUCT_NAME} | Super Admin`,
      template: `%s | ${PRODUCT_NAME}`,
    },
    description: `${PRODUCT_NAME} | Super Admin — platform operations by Adverito.`,
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
