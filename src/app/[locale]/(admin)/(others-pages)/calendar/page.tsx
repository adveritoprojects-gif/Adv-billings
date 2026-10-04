import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CalendarLoader from "@/components/calendar/CalendarLoader";
import { getTranslations } from "next-intl/server";

import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("calendarPage");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function CalendarPage() {
  const t = await getTranslations("calendarPage");
  return (
    <div>
      <PageBreadcrumb pageTitle={t("breadcrumb")} />
      <CalendarLoader />
    </div>
  );
}
