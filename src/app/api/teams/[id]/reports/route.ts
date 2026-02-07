import { NextRequest, NextResponse } from "next/server";
import { getTeamReportStats } from "@/lib/db/reports";
import { authorizeTeamAccess, getUserIdFromRequest } from "@/lib/permissions";

// GET - Get report statistics for a team
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseInt(id, 10);

    if (isNaN(teamId)) {
      return NextResponse.json(
        { error: "Invalid team ID" },
        { status: 400 }
      );
    }

    const auth = await authorizeTeamAccess({
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Get query parameters for date filtering
    const searchParams = request.nextUrl.searchParams;
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    const stats = await getTeamReportStats(teamId, startDate, endDate);

    return NextResponse.json({ stats }, { status: 200 });
  } catch (error) {
    console.error("Error fetching report stats:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching report statistics" },
      { status: 500 }
    );
  }
}
