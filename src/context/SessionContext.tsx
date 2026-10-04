"use client";

import type { SessionPayload } from "@/server/auth/payload";
import { createContext, useContext } from "react";

const SessionContext = createContext<SessionPayload | null>(null);

export function SessionProvider({
  value,
  children,
}: {
  value: SessionPayload;
  children: React.ReactNode;
}) {
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionPayload {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return session;
}
