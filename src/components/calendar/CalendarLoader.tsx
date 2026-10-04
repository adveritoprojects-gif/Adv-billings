"use client";

import dynamic from "next/dynamic";

const Calendar = dynamic(() => import("@/components/calendar/Calendar"), {
  ssr: false,
  loading: () => (
    <div className="h-96 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
  ),
});

export default function CalendarLoader() {
  return <Calendar />;
}
