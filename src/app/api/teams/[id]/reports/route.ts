import { NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/permissions";
import { ERROR_CODES } from "@/lib/errors";
import { errorResponse,
  serviceErrorResponse,
  successResponse,
} from "@/lib/api-route";
import { parseRouteParamId } from "@/lib/api-route";
import { internalServiceError } from "@/lib/services/errors";
import { getTeamReportStatsForUser } from "@/lib/services/reports";
import { ensureTeamHasActiveSubscription } from "@/lib/api-team-subscription";

// GET - Get report statistics for a team
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseRouteParamId(id);

    if (teamId === null) {
      return errorResponse("Invalid team ID", 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const access = await ensureTeamHasActiveSubscription({
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!access.ok) {
      return access.response;
    }

    // Get query parameters for date filtering
    const searchParams = request.nextUrl.searchParams;
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    const result = await getTeamReportStatsForUser({
      teamId,
      requestUserId: access.requestUserId,
      startDate,
      endDate,
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse({ stats: result.data.stats });
  } catch (error) {
    console.error("Error fetching report stats:", error);
    return serviceErrorResponse(internalServiceError("An error occurred while fetching report statistics"));
  }
}
