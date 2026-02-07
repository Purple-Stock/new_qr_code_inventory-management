import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/permissions";
import { ERROR_CODES } from "@/lib/errors";
import {
  errorResponse,
  internalErrorResponse,
  serviceErrorResponse,
  successResponse,
} from "@/lib/api-route";
import { getTeamReportStatsForUser } from "@/lib/services/reports";

// GET - Get report statistics for a team
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseInt(id, 10);

    if (isNaN(teamId)) {
      return errorResponse("Invalid team ID", 400, ERROR_CODES.VALIDATION_ERROR);
    }

    // Get query parameters for date filtering
    const searchParams = request.nextUrl.searchParams;
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    const result = await getTeamReportStatsForUser({
      teamId,
      requestUserId: getUserIdFromRequest(request),
      startDate,
      endDate,
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse({ stats: result.data.stats });
  } catch (error) {
    console.error("Error fetching report stats:", error);
    return internalErrorResponse("An error occurred while fetching report statistics");
  }
}
