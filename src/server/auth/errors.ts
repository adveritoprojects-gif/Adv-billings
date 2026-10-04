export type AuthErrorCode =
  | "UNAUTHENTICATED"
  | "NO_ORGANIZATION"
  | "FORBIDDEN"
  | "MODULE_DISABLED";

const STATUS_BY_CODE: Record<AuthErrorCode, number> = {
  UNAUTHENTICATED: 401,
  NO_ORGANIZATION: 403,
  FORBIDDEN: 403,
  MODULE_DISABLED: 403,
};

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly status: number;

  constructor(code: AuthErrorCode, message?: string) {
    super(message ?? code);
    this.name = "AuthError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
  }
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

export function authErrorResponse(error: unknown): Response | null {
  if (!isAuthError(error)) {
    return null;
  }
  return Response.json(
    { error: error.code },
    { status: error.status, headers: { "cache-control": "no-store" } },
  );
}
