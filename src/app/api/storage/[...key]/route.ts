import { NextRequest } from "next/server";
import { ERROR_CODES } from "@/lib/errors";
import {
  binaryResponse,
  errorResponse,
  parseRouteParamId,
  serviceErrorResponse,
} from "@/lib/api-route";
import { internalServiceError } from "@/lib/services/errors";
import { getStoredObject } from "@/lib/services/item-images";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key: keySegments } = await params;
    const teamId = parseRouteParamId(keySegments[3] ?? "");
    if (teamId === null) {
      return errorResponse("Invalid storage object key", 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const result = await getStoredObject({
      keySegments,
      runtimeHost: request.headers.get("host"),
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return binaryResponse(result.data.body, result.data.contentType);
  } catch (error) {
    console.error("Error reading stored object:", error);
    return serviceErrorResponse(internalServiceError("Failed to read storage object"));
  }
}
