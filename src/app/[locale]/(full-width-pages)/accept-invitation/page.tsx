import AcceptInvitationForm from "@/components/auth/AcceptInvitationForm";
import { getInvitationPreview } from "@/server/services/invitations";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Activate your account | Adverito",
  robots: { index: false, follow: false },
};

interface AcceptInvitationPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function AcceptInvitationPage({
  searchParams,
}: AcceptInvitationPageProps) {
  const t = await getTranslations("acceptInvitation");
  const { token } = await searchParams;
  const preview = await getInvitationPreview(
    typeof token === "string" ? token : "",
  );

  if (preview.status !== "valid") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
        <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-8 text-center shadow-theme-md dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-title-sm font-semibold text-gray-800 dark:text-white/90">
            {t("title")}
          </h1>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {t(`status.${preview.status}`)}
          </p>
          <p className="mt-6 text-theme-xs text-gray-400">{t("supportNote")}</p>
        </div>
      </div>
    );
  }

  return (
    <AcceptInvitationForm
      token={typeof token === "string" ? token : ""}
      setsPassword={preview.setsPassword}
      ownerName={preview.ownerName}
      organizationName={preview.organizationName}
      expiresAt={preview.expiresAt.toISOString()}
    />
  );
}
