import { vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, PUT } from "@/app/api/admin/teams/[id]/route";
import { ERROR_CODES } from "@/lib/errors";

vi.mock("@/lib/services/admin", () => ({
  updateTeamAsSuperAdmin: vi.fn(),
  deleteTeamAsSuperAdmin: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({
  getUserIdFromRequest: vi.fn(),
}));

import { deleteTeamAsSuperAdmin, updateTeamAsSuperAdmin } from "@/lib/services/admin";
import { getUserIdFromRequest } from "@/lib/permissions";

const mockedUpdateTeamAsSuperAdmin = vi.mocked(updateTeamAsSuperAdmin);
const mockedDeleteTeamAsSuperAdmin = vi.mocked(deleteTeamAsSuperAdmin);
const mockedGetUserIdFromRequest = vi.mocked(getUserIdFromRequest);

describe("/api/admin/teams/[id] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetUserIdFromRequest.mockReturnValue(99);
  });

  it("returns updated team when PUT succeeds", async () => {
    mockedUpdateTeamAsSuperAdmin.mockResolvedValue({
      ok: true,
      data: {
        team: {
          id: 42,
          userId: 7,
          companyId: 3,
          name: "Updated Team",
          notes: "Updated notes",
          ownerEmail: "owner@example.com",
          companyName: "Updated Company",
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          stripeSubscriptionStatus: null,
          stripePriceId: null,
          stripeCurrentPeriodEnd: null,
          manualTrialEndsAt: null,
          adminPipelineStatus: null,
          adminLastEmailSentAt: null,
          memberCount: 1,
          itemCount: 0,
          transactionCount: 0,
          createdAt: "2026-06-05T00:00:00.000Z",
          updatedAt: "2026-06-05T00:00:00.000Z",
        },
      },
    });

    const payload = {
      name: "Updated Team",
      companyName: "Updated Company",
      notes: "Updated notes",
    };
    const response = await PUT(
      new NextRequest("http://localhost:3000/api/admin/teams/42", {
        method: "PUT",
        body: JSON.stringify(payload),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "42" }) }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: "Team updated successfully",
      team: expect.objectContaining({
        id: 42,
        name: "Updated Team",
        companyName: "Updated Company",
      }),
    });
    expect(mockedUpdateTeamAsSuperAdmin).toHaveBeenCalledWith({
      requestUserId: 99,
      teamId: 42,
      payload,
    });
  });

  it("returns deleted team id when DELETE succeeds", async () => {
    mockedDeleteTeamAsSuperAdmin.mockResolvedValue({
      ok: true,
      data: { teamId: 42 },
    });

    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/admin/teams/42", {
        method: "DELETE",
        body: JSON.stringify({ force: true }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "42" }) }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: "Team deleted successfully",
      teamId: 42,
    });
    expect(mockedDeleteTeamAsSuperAdmin).toHaveBeenCalledWith({
      requestUserId: 99,
      teamId: 42,
      payload: { force: true },
    });
  });

  it("maps service errors", async () => {
    mockedDeleteTeamAsSuperAdmin.mockResolvedValue({
      ok: false,
      error: {
        status: 409,
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        error: "Cannot delete team while subscription is active. Use force=true to override.",
      },
    });

    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/admin/teams/42", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "42" }) }
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      error: "Cannot delete team while subscription is active. Use force=true to override.",
    });
  });
});
