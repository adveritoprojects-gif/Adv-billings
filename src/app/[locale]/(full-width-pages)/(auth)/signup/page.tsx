import AuthAside from "@/components/auth/AuthAside";
import SignUpForm from "@/components/auth/SignUpForm";
import { lookupTenantBranding } from "@/server/tenant-branding";
import { headers } from "next/headers";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Next.js SignUp Page | TailAdmin - Next.js Dashboard Template",
  description: "This is Next.js Signin Page TailAdmin Dashboard Template",
};

export default async function SignUp({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const [{ org }, headerList] = await Promise.all([searchParams, headers()]);
  const branding = await lookupTenantBranding({
    org,
    host: headerList.get("host"),
  });

  return <SignUpForm branding={branding} aside={<AuthAside branding={branding} />} />;
}
