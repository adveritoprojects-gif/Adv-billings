"use client";

import { useSidebar } from "@/context/SidebarContext";
import { SessionProvider } from "@/context/SessionContext";
import type { SessionPayload } from "@/server/auth/payload";
import SuperAdminHeader from "@/layout/SuperAdminHeader";
import SuperAdminSidebar from "@/layout/SuperAdminSidebar";
import Backdrop from "@/layout/Backdrop";
import React from "react";

export default function SuperAdminShell({
  children,
  session,
}: {
  children: React.ReactNode;
  session: SessionPayload;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  const mainContentMargin = isMobileOpen
    ? "ms-0"
    : isExpanded || isHovered
      ? "xl:ms-[290px]"
      : "xl:ms-[90px]";

  return (
    <SessionProvider value={session}>
      <div className="min-h-screen xl:flex">
        <SuperAdminSidebar />
        <Backdrop />
        <div
          className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}
        >
          <SuperAdminHeader />
          <div className="mx-auto max-w-(--breakpoint-2xl) p-4 md:p-6">
            {children}
          </div>
        </div>
      </div>
    </SessionProvider>
  );
}
