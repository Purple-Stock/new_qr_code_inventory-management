import { NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/permissions";
import { ERROR_CODES } from "@/lib/errors";
import { errorResponse, serviceErrorResponse, successResponse } from "@/lib/api-route";
import { parseRouteParamId } from "@/lib/api-route";
import { internalServiceError } from "@/lib/services/errors";
import { getTeamForUser } from "@/lib/services/teams";

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

    const teamResult = await getTeamForUser({
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!teamResult.ok) {
      return serviceErrorResponse(teamResult.error);
    }

    const labelLogoUrl = teamResult.data.team.labelLogoUrl;
    if (!labelLogoUrl) {
      return errorResponse(
        "Team does not have a label logo",
        404,
        ERROR_CODES.LABEL_LOGO_NOT_FOUND
      );
    }

    if (labelLogoUrl.startsWith("data:image/")) {
      return successResponse({ dataUrl: labelLogoUrl });
    }

    const logoResponse = await fetch(labelLogoUrl);
    if (!logoResponse.ok) {
      return errorResponse(
        "Could not fetch label logo",
        422,
        ERROR_CODES.LABEL_LOGO_FETCH_FAILED
      );
    }

    const arrayBuffer = await logoResponse.arrayBuffer();
    const sourceBuffer = Buffer.from(arrayBuffer);

    // Normalize to PNG to maximize jsPDF compatibility (jpeg/png are safest).
    let outputBytes: Uint8Array = sourceBuffer;
    try {
      const { default: sharp } = await import("sharp");
      outputBytes = await sharp(sourceBuffer).png().toBuffer();
    } catch {
      outputBytes = sourceBuffer;
    }

    const base64 = Buffer.from(outputBytes).toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;

    return successResponse({ dataUrl });
  } catch (error) {
    console.error("Error fetching label logo data:", error);
    return serviceErrorResponse(
      internalServiceError("An error occurred while fetching label logo data")
    );
  }
}
