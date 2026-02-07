import { NextRequest } from "next/server";
import { POST } from "@/app/api/teams/[id]/billing/portal/route";
import { ERROR_CODES } from "@/lib/errors";

jest.mock("@/lib/services/billing", () => ({
  createTeamStripePortalSession: jest.fn(),
}));

jest.mock("@/lib/permissions", () => ({
  getUserIdFromRequest: jest.fn(),
}));

import { createTeamStripePortalSession } from "@/lib/services/billing";
import { getUserIdFromRequest } from "@/lib/permissions";

const mockedCreateTeamStripePortalSession = jest.mocked(createTeamStripePortalSession);
const mockedGetUserIdFromRequest = jest.mocked(getUserIdFromRequest);

describe("/api/teams/[id]/billing/portal route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetUserIdFromRequest.mockReturnValue(15);
  });

  it("returns 400 when team id is invalid", async () => {
    const response = await POST(
      new NextRequest("http://localhost:3000/api/teams/x/billing/portal", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "x" }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      error: "Invalid team ID",
    });
    expect(mockedCreateTeamStripePortalSession).not.toHaveBeenCalled();
  });

  it("returns portal url when service succeeds", async () => {
    mockedCreateTeamStripePortalSession.mockResolvedValue({
      ok: true,
      data: { url: "https://billing.stripe.com/p/test" },
    });

    const request = new NextRequest("http://localhost:3000/api/teams/7/billing/portal", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    });
    const response = await POST(request, { params: Promise.resolve({ id: "7" }) });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      url: "https://billing.stripe.com/p/test",
    });
    expect(mockedCreateTeamStripePortalSession).toHaveBeenCalledWith({
      teamId: 7,
      requestUserId: 15,
      origin: "http://localhost:3000",
    });
  });

  it("maps service errors", async () => {
    mockedCreateTeamStripePortalSession.mockResolvedValue({
      ok: false,
      error: {
        status: 404,
        errorCode: ERROR_CODES.BILLING_CUSTOMER_NOT_FOUND,
        error: "Team does not have a Stripe customer yet",
      },
    });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/teams/7/billing/portal", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "7" }) }
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.BILLING_CUSTOMER_NOT_FOUND,
      error: "Team does not have a Stripe customer yet",
    });
  });
});
