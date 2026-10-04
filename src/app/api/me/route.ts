import { authErrorResponse, isAuthError } from "@/server/auth/errors";
import { requireOrganization } from "@/server/auth/guards";
import { toSessionPayload } from "@/server/auth/payload";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireOrganization();
    return Response.json(
      { data: toSessionPayload(ctx) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (!isAuthError(error)) {
      console.error("GET /api/me failed:", error);
    }
    return authErrorResponse(error) ?? Response.json(
      { error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
