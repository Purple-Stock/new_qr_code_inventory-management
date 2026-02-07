import { NextRequest } from "next/server";
import { POST } from "@/app/api/teams/[id]/billing/sync/route";
import { ERROR_CODES } from "@/lib/errors";

jest.mock("@/lib/services/billing", () => ({
  syncTeamStripeSubscriptionFromProvider: jest.fn(),
}));

jest.mock("@/lib/permissions", () => ({
  getUserIdFromRequest: jest.fn(),
}));

import { syncTeamStripeSubscriptionFromProvider } from "@/lib/services/billing";
import { getUserIdFromRequest } from "@/lib/permissions";

const mockedSyncTeamStripeSubscriptionFromProvider = jest.mocked(
  syncTeamStripeSubscriptionFromProvider
);
const mockedGetUserIdFromRequest = jest.mocked(getUserIdFromRequest);

describe("/api/teams/[id]/billing/sync route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetUserIdFromRequest.mockReturnValue(12);
  });

  it("returns 400 for invalid team id", async () => {
    const response = await POST(
      new NextRequest("http://localhost:3000/api/teams/x/billing/sync", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "x" }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      error: "Invalid team ID",
    });
  });

  it("returns sync payload when service succeeds", async () => {
    mockedSyncTeamStripeSubscriptionFromProvider.mockResolvedValue({
      ok: true,
      data: { synced: true, subscriptionStatus: "active" },
    });

    const request = new NextRequest("http://localhost:3000/api/teams/5/billing/sync", {
      method: "POST",
    });
    const response = await POST(request, { params: Promise.resolve({ id: "5" }) });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      synced: true,
      subscriptionStatus: "active",
    });
    expect(mockedSyncTeamStripeSubscriptionFromProvider).toHaveBeenCalledWith({
      teamId: 5,
      requestUserId: 12,
    });
  });
});
