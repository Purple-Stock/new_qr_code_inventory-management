import { NextRequest } from "next/server";
import { POST } from "@/app/api/stripe/webhook/route";
import { ERROR_CODES } from "@/lib/errors";

jest.mock("@/lib/services/billing", () => ({
  processStripeWebhook: jest.fn(),
}));

import { processStripeWebhook } from "@/lib/services/billing";

const mockedProcessStripeWebhook = jest.mocked(processStripeWebhook);

describe("/api/stripe/webhook route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns success payload when service succeeds", async () => {
    mockedProcessStripeWebhook.mockResolvedValue({
      ok: true,
      data: { received: true },
    });

    const request = new NextRequest("http://localhost:3000/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "sig_test" },
      body: "{}",
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(mockedProcessStripeWebhook).toHaveBeenCalledWith({
      signature: "sig_test",
      rawBody: "{}",
    });
  });

  it("maps service errors", async () => {
    mockedProcessStripeWebhook.mockResolvedValue({
      ok: false,
      error: {
        status: 400,
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        error: "Missing Stripe-Signature header",
      },
    });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/stripe/webhook", {
        method: "POST",
        body: "{}",
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      error: "Missing Stripe-Signature header",
    });
  });
});
