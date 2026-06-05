import { vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/teams/[id]/billing/manual-activate/route";
import { ERROR_CODES } from "@/lib/errors";

vi.mock("@/lib/services/billing", () => ({
  activateTeamManualBilling: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({
  getUserIdFromRequest: vi.fn(),
}));

import { activateTeamManualBilling } from "@/lib/services/billing";
import { getUserIdFromRequest } from "@/lib/permissions";

const mockedActivateTeamManualBilling = vi.mocked(activateTeamManualBilling);
const mockedGetUserIdFromRequest = vi.mocked(getUserIdFromRequest);

describe("/api/admin/teams/[id]/billing/manual-activate route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetUserIdFromRequest.mockReturnValue(99);
  });

  it("returns 400 when team id is invalid", async () => {
    const response = await POST(
      new NextRequest("http://localhost:3000/api/admin/teams/x/billing/manual-activate", {
        method: "POST",
        body: JSON.stringify({ durationDays: 30 }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "x" }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      error: "Invalid team ID",
    });
  });

  it("returns billing payload when service succeeds", async () => {
    mockedActivateTeamManualBilling.mockResolvedValue({
      ok: true,
      data: {
        subscriptionStatus: "active",
        currentPeriodEnd: "2026-04-10T00:00:00.000Z",
      },
    });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/admin/teams/4/billing/manual-activate", {
        method: "POST",
        body: JSON.stringify({ durationDays: 30, reason: "PIX" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "4" }) }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      subscriptionStatus: "active",
      currentPeriodEnd: "2026-04-10T00:00:00.000Z",
    });
    expect(mockedActivateTeamManualBilling).toHaveBeenCalledWith({
      teamId: 4,
      requestUserId: 99,
      payload: { durationDays: 30, reason: "PIX" },
    });
  });

  it("maps service errors", async () => {
    mockedActivateTeamManualBilling.mockResolvedValue({
      ok: false,
      error: {
        status: 403,
        errorCode: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        error: "Super admin access required",
      },
    });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/admin/teams/4/billing/manual-activate", {
        method: "POST",
        body: JSON.stringify({ durationDays: 30 }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "4" }) }
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
      error: "Super admin access required",
    });
  });
});
