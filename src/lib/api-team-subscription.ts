import { ERROR_CODES } from "@/lib/errors";
import { authorizeTeamAccess } from "@/lib/permissions";
import { serviceErrorResponse } from "@/lib/api-route";
import { authServiceError, makeServiceError } from "@/lib/services/errors";
import { hasActiveTeamSubscription } from "@/lib/services/subscription-access";

export async function ensureTeamHasActiveSubscription(params: {
  teamId: number;
  requestUserId: number | null;
}): Promise<{ ok: true; requestUserId: number } | { ok: false; response: Response }> {
  const access = await authorizeTeamAccess({
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!access.ok) {
    return { ok: false, response: serviceErrorResponse(authServiceError(access)) };
  }

  if (!access.team || !access.user) {
    return {
      ok: false,
      response: serviceErrorResponse(
        makeServiceError(500, ERROR_CODES.INTERNAL_ERROR, "Failed to resolve team access context")
      ),
    };
  }

  if (!hasActiveTeamSubscription(access.team)) {
    return {
      ok: false,
      response: serviceErrorResponse(
        makeServiceError(403, ERROR_CODES.FORBIDDEN, "Active subscription required")
      ),
    };
  }

  return { ok: true, requestUserId: access.user.id };
}
