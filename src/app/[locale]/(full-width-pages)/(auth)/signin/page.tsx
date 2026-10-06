import AuthAside from "@/components/auth/AuthAside";
import SignInForm from "@/components/auth/SignInForm";
import { lookupTenantBranding } from "@/server/tenant-branding";
import { headers } from "next/headers";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to Adv Billings — Business management, CRM and operations platform by Adverito.",
};

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const [{ org }, headerList] = await Promise.all([searchParams, headers()]);
  const branding = await lookupTenantBranding({
    org,
    host: headerList.get("host"),
  });

  return <SignInForm branding={branding} aside={<AuthAside branding={branding} />} />;
}
