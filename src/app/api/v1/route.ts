import { successResponse } from "@/lib/api-route";
import { getRemovedApiV1Payload } from "@/lib/services/legacy-routes";

const REMOVED_ROUTE_HEADERS = {
  "X-Robots-Tag": "noindex, nofollow",
  "Cache-Control": "public, max-age=0, must-revalidate",
};

export function GET() {
  const response = successResponse(getRemovedApiV1Payload(), 410);

  for (const [header, value] of Object.entries(REMOVED_ROUTE_HEADERS)) {
    response.headers.set(header, value);
  }

  return response;
}
