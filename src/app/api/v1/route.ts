import { successResponse } from "@/lib/api-route";
import { getRemovedApiV1Payload } from "@/lib/services/legacy-routes";

const REMOVED_ROUTE_HEADERS = {
  "X-Robots-Tag": "noindex, nofollow",
  "Cache-Control": "public, max-age=0, must-revalidate",
};

export function GET() {
  return successResponse(getRemovedApiV1Payload(), 410, REMOVED_ROUTE_HEADERS);
}
