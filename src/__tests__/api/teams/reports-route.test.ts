import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/teams/[id]/reports/route";
import { ERROR_CODES } from "@/lib/errors";

vi.mock("@/lib/permissions", () => ({
  getUserIdFromRequest: vi.fn(),
}));

vi.mock("@/lib/api-team-subscription", () => ({
  ensureTeamHasActiveSubscription: vi.fn(),
}));

vi.mock("@/lib/services/reports", () => ({
  getTeamReportStatsForUser: vi.fn(),
}));

import { getUserIdFromRequest } from "@/lib/permissions";
import { ensureTeamHasActiveSubscription } from "@/lib/api-team-subscription";
import { getTeamReportStatsForUser } from "@/lib/services/reports";

const mockedGetUserIdFromRequest = vi.mocked(getUserIdFromRequest);
const mockedEnsureTeamHasActiveSubscription = vi.mocked(ensureTeamHasActiveSubscription);
const mockedGetTeamReportStatsForUser = vi.mocked(getTeamReportStatsForUser);

describe("/api/teams/[id]/reports route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetUserIdFromRequest.mockReturnValue(12);
    mockedEnsureTeamHasActiveSubscription.mockResolvedValue({
      ok: true,
      requestUserId: 12,
    } as any);
  });

  it("returns 400 for invalid teamId", async () => {
    const request = new NextRequest("http://localhost:3000/api/teams/abc/reports");

    const response = await GET(request, { params: Promise.resolve({ id: "abc" }) });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      error: "Invalid team ID",
    });
  });

  it("returns 200 and forwards parsed date filters", async () => {
    mockedGetTeamReportStatsForUser.mockResolvedValueOnce({
      ok: true,
      data: {
        stats: {
          totalItems: 5,
        },
      },
    } as any);

    const request = new NextRequest(
      "http://localhost:3000/api/teams/10/reports?startDate=2026-01-01&endDate=2026-01-31"
    );

    const response = await GET(request, { params: Promise.resolve({ id: "10" }) });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      stats: {
        totalItems: 5,
      },
    });

    expect(mockedGetTeamReportStatsForUser).toHaveBeenCalledWith({
      teamId: 10,
      requestUserId: 12,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-31"),
    });
  });

  it("maps service errors using serviceErrorResponse", async () => {
    mockedGetTeamReportStatsForUser.mockResolvedValueOnce({
      ok: false,
      error: {
        status: 403,
        errorCode: ERROR_CODES.FORBIDDEN,
        error: "Forbidden",
      },
    } as any);

    const response = await GET(new NextRequest("http://localhost:3000/api/teams/10/reports"), {
      params: Promise.resolve({ id: "10" }),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.FORBIDDEN,
      error: "Forbidden",
    });
  });

  it("returns 500 for unexpected exceptions", async () => {
    mockedGetTeamReportStatsForUser.mockRejectedValueOnce(new Error("db down"));

    const response = await GET(new NextRequest("http://localhost:3000/api/teams/10/reports"), {
      params: Promise.resolve({ id: "10" }),
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.INTERNAL_ERROR,
      error: "An error occurred while fetching report statistics",
    });
  });
});
