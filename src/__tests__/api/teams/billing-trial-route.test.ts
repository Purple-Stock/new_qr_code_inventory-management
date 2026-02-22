import { vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/teams/[id]/billing/trial/route";
import { ERROR_CODES } from "@/lib/errors";

vi.mock("@/lib/services/billing", () => ({
  grantTeamManualTrial: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({
  getUserIdFromRequest: vi.fn(),
}));

import { grantTeamManualTrial } from "@/lib/services/billing";
import { getUserIdFromRequest } from "@/lib/permissions";

const mockedGrantTeamManualTrial = vi.mocked(grantTeamManualTrial);
const mockedGetUserIdFromRequest = vi.mocked(getUserIdFromRequest);

describe("/api/teams/[id]/billing/trial route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetUserIdFromRequest.mockReturnValue(9);
  });

  it("returns 400 when team id is invalid", async () => {
    const response = await POST(
      new NextRequest("http://localhost:3000/api/teams/x/billing/trial", {
        method: "POST",
        body: JSON.stringify({ durationDays: 14 }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "x" }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      error: "Invalid team ID",
    });
    expect(mockedGrantTeamManualTrial).not.toHaveBeenCalled();
  });

  it("returns trial payload when service succeeds", async () => {
    mockedGrantTeamManualTrial.mockResolvedValue({
      ok: true,
      data: {
        manualTrialEndsAt: "2026-03-01T00:00:00.000Z",
        manualTrialGrantsCount: 2,
      },
    });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/teams/4/billing/trial", {
        method: "POST",
        body: JSON.stringify({ durationDays: 14, reason: "winback" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "4" }) }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      manualTrialEndsAt: "2026-03-01T00:00:00.000Z",
      manualTrialGrantsCount: 2,
    });
    expect(mockedGrantTeamManualTrial).toHaveBeenCalledWith({
      teamId: 4,
      requestUserId: 9,
      payload: { durationDays: 14, reason: "winback" },
    });
  });

  it("maps service errors", async () => {
    mockedGrantTeamManualTrial.mockResolvedValue({
      ok: false,
      error: {
        status: 409,
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        error: "Manual trial grant limit reached for this team",
      },
    });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/teams/4/billing/trial", {
        method: "POST",
        body: JSON.stringify({ durationDays: 14 }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "4" }) }
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      error: "Manual trial grant limit reached for this team",
    });
  });
});
