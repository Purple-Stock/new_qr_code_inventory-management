import { type NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/permissions";
import { internalServiceError } from "@/lib/services/errors";
import { serviceErrorResponse, successResponse } from "@/lib/api-route";
import { sendNonSubscriberCampaign } from "@/lib/services/admin";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | {
          teamIds?: number[];
          subject?: string;
          message?: string;
          ctaUrl?: string;
          ctaLabel?: string;
        }
      | null;

    const result = await sendNonSubscriberCampaign({
      requestUserId: getUserIdFromRequest(request),
      teamIds: Array.isArray(body?.teamIds) ? body.teamIds : [],
      subject: body?.subject ?? "",
      message: body?.message ?? "",
      ctaUrl: body?.ctaUrl,
      ctaLabel: body?.ctaLabel,
    });

    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse(result.data, 200);
  } catch (error) {
    console.error("Error sending non-subscriber campaign:", error);
    return serviceErrorResponse(
      internalServiceError("An error occurred while sending the non-subscriber campaign")
    );
  }
}
