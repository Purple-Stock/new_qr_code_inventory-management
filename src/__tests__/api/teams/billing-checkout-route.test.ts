import { vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/teams/[id]/billing/checkout/route";
import { ERROR_CODES } from "@/lib/errors";

vi.mock("@/lib/services/billing", () => ({
  createTeamStripeCheckoutSession: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({
  getUserIdFromRequest: vi.fn(),
}));

import { createTeamStripeCheckoutSession } from "@/lib/services/billing";
import { getUserIdFromRequest } from "@/lib/permissions";

const mockedCreateTeamStripeCheckoutSession = vi.mocked(createTeamStripeCheckoutSession);
const mockedGetUserIdFromRequest = vi.mocked(getUserIdFromRequest);

describe("/api/teams/[id]/billing/checkout route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetUserIdFromRequest.mockReturnValue(15);
  });

  it("returns 400 when team id is invalid", async () => {
    const response = await POST(
      new NextRequest("http://localhost:3000/api/teams/x/billing/checkout", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "x" }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      error: "Invalid team ID",
    });
    expect(mockedCreateTeamStripeCheckoutSession).not.toHaveBeenCalled();
  });

  it("returns checkout url when service succeeds", async () => {
    mockedCreateTeamStripeCheckoutSession.mockResolvedValue({
      ok: true,
      data: { url: "https://checkout.stripe.com/test" },
    });

    const request = new NextRequest("http://localhost:3000/api/teams/7/billing/checkout", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    });
    const response = await POST(request, { params: Promise.resolve({ id: "7" }) });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      url: "https://checkout.stripe.com/test",
    });
    expect(mockedCreateTeamStripeCheckoutSession).toHaveBeenCalledWith({
      teamId: 7,
      requestUserId: 15,
      origin: "http://localhost:3000",
    });
  });

  it("maps service errors", async () => {
    mockedCreateTeamStripeCheckoutSession.mockResolvedValue({
      ok: false,
      error: {
        status: 502,
        errorCode: ERROR_CODES.BILLING_PROVIDER_ERROR,
        error: "Failed to create Stripe checkout session",
      },
    });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/teams/7/billing/checkout", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "7" }) }
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.BILLING_PROVIDER_ERROR,
      error: "Failed to create Stripe checkout session",
    });
  });
});
