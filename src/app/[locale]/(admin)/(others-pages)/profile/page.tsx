import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DangerZone from "@/components/user-profile/DangerZone";
import Security from "@/components/user-profile/Security";
import UserMetaCard from "@/components/user-profile/UserMetaCard";
import { PRODUCT_NAME } from "@/utils/branding";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
  description: `Manage your ${PRODUCT_NAME} personal information and account security.`,
};

export default function Profile() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Profile" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:p-6 dark:border-gray-800 dark:bg-white/3">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 lg:mb-7 dark:text-white/90">
          Profile
        </h3>
        <div className="space-y-6">
          <UserMetaCard />
          <Security />
          <DangerZone />
        </div>
      </div>
    </div>
  );
}
