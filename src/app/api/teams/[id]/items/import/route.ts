import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { errorResponse, serviceErrorResponse, successResponse, parseRouteParamId } from "@/lib/api-route";
import { ERROR_CODES } from "@/lib/errors";
import { internalServiceError } from "@/lib/services/errors";
import { getUserIdFromRequest } from "@/lib/permissions";
import { ensureTeamHasActiveSubscription } from "@/lib/api-team-subscription";
import { importTeamItemsCsv, previewTeamItemsCsvImport } from "@/lib/services/items";

export async function POST(
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

    const body = await request.json();
    if (body?.mode === "preview") {
      const result = await previewTeamItemsCsvImport({
        teamId,
        requestUserId: access.requestUserId,
        payload: body,
      });
      if (!result.ok) {
        return serviceErrorResponse(result.error);
      }

      return successResponse(result.data);
    }

    const result = await importTeamItemsCsv({
      teamId,
      requestUserId: access.requestUserId,
      payload: body,
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    revalidatePath(`/teams/${teamId}/items`);

    return successResponse({
      message: "Items imported successfully",
      summary: result.data.summary,
    });
  } catch (error) {
    console.error("Error importing items:", error);
    return serviceErrorResponse(internalServiceError("An error occurred while importing items"));
  }
}
