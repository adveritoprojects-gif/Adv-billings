"use client";

import { useSyncExternalStore } from "react";

const DESKTOP_QUERY = "(min-width: 1280px)";

const subscribe = (onStoreChange: () => void) => {
  const mediaQuery = window.matchMedia(DESKTOP_QUERY);
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
};

const getSnapshot = () => window.matchMedia(DESKTOP_QUERY).matches;

const getServerSnapshot = () => true;

export function useIsDesktop() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
