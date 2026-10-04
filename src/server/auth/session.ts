import { cookies } from "next/headers";

import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_DEFAULT,
  SESSION_MAX_AGE_REMEMBER,
  signSessionToken,
  unsignSessionToken,
} from "./session-token";

export async function readSessionCookie(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) {
    return null;
  }
  return unsignSessionToken(raw);
}

export async function setSessionCookie(
  token: string,
  remember: boolean,
): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, signSessionToken(token), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: remember ? SESSION_MAX_AGE_REMEMBER : SESSION_MAX_AGE_DEFAULT,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}
