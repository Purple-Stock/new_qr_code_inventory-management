import { NextRequest, NextResponse } from "next/server";
import { getTeamReportStats } from "@/lib/db/reports";
import { getTeamWithStats } from "@/lib/db/teams";

// GET - Get report statistics for a team
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const teamId = parseInt(params.id, 10);

    if (isNaN(teamId)) {
      return NextResponse.json(
        { error: "Invalid team ID" },
        { status: 400 }
      );
    }

    // Verify team exists
    const team = await getTeamWithStats(teamId);
    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
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
