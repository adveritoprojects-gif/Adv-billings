import { authErrorResponse, isAuthError } from "@/server/auth/errors";
import { requireModule, requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";
import { listActivity } from "@/server/services/activity";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requirePermission(PERMISSIONS.ACTIVITY_READ);
    await requireModule("activity", ctx);
    const data = await listActivity(ctx, 100);
    return Response.json(
      { organizationId: ctx.organization.id, data },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (!isAuthError(error)) {
      console.error("GET /api/activity failed:", error);
    }
    return authErrorResponse(error) ?? Response.json(
      { error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
