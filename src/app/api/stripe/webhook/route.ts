import type { NextRequest } from "next/server";
import { serviceErrorResponse, successResponse } from "@/lib/api-route";
import { processStripeWebhook } from "@/lib/services/billing";
import { internalServiceError } from "@/lib/services/errors";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const result = await processStripeWebhook({
      signature: request.headers.get("stripe-signature"),
      rawBody,
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse(result.data);
  } catch (error: unknown) {
    console.error("Error in Stripe webhook route:", error);
    return serviceErrorResponse(internalServiceError("Failed to process Stripe webhook"));
  }
}
