import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "session";

export const SESSION_MAX_AGE_REMEMBER = 60 * 60 * 24 * 30;
export const SESSION_MAX_AGE_DEFAULT = 60 * 60 * 24 * 7;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set. Add it to .env (see .env.example).",
    );
  }
  if (
    secret.length < 32 ||
    secret.includes("replace-me") ||
    secret.toLowerCase().includes("example")
  ) {
    throw new Error(
      "SESSION_SECRET is too weak. Use a random secret of at least 32 characters (openssl rand -base64 48).",
    );
  }
  return secret;
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function signSessionToken(token: string): string {
  const signature = createHmac("sha256", getSecret())
    .update(token)
    .digest("base64url");
  return `${token}.${signature}`;
}

export function unsignSessionToken(signedValue: string): string | null {
  const separatorIndex = signedValue.lastIndexOf(".");
  if (separatorIndex <= 0) {
    return null;
  }
  const token = signedValue.slice(0, separatorIndex);
  const signature = signedValue.slice(separatorIndex + 1);
  const expected = createHmac("sha256", getSecret())
    .update(token)
    .digest("base64url");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }
  return token;
}
