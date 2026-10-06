import AuthAside from "@/components/auth/AuthAside";
import SignUpForm from "@/components/auth/SignUpForm";
import { lookupTenantBranding } from "@/server/tenant-branding";
import { headers } from "next/headers";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up",
  description:
    "Create your Adv Billings account — Business management, CRM and operations platform by Adverito.",
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
