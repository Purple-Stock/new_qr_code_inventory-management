import { vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/users/team/route";
import { ERROR_CODES } from "@/lib/errors";

vi.mock("@/lib/services/admin", () => ({
  createTeamForUserAsSuperAdmin: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({
  getUserIdFromRequest: vi.fn(),
}));

import { createTeamForUserAsSuperAdmin } from "@/lib/services/admin";
import { getUserIdFromRequest } from "@/lib/permissions";

const mockedCreateTeamForUserAsSuperAdmin = vi.mocked(createTeamForUserAsSuperAdmin);
const mockedGetUserIdFromRequest = vi.mocked(getUserIdFromRequest);

describe("/api/admin/users/team route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetUserIdFromRequest.mockReturnValue(99);
  });

  it("returns created team payload when service succeeds", async () => {
    mockedCreateTeamForUserAsSuperAdmin.mockResolvedValue({
      ok: true,
      data: {
        team: {
          id: 42,
          userId: 7,
          companyId: 3,
          name: "Acme Estoque",
          notes: "Criado pelo admin",
          ownerEmail: "owner@example.com",
          companyName: "Acme",
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
        user: {
          id: 7,
          email: "owner@example.com",
          created: false,
        },
      },
    });

    const payload = {
      email: "owner@example.com",
      teamName: "Acme Estoque",
      notes: "Criado pelo admin",
    };
    const response = await POST(
      new NextRequest("http://localhost:3000/api/admin/users/team", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "content-type": "application/json" },
      })
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      message: "Team created successfully",
      team: expect.objectContaining({
        id: 42,
        name: "Acme Estoque",
        ownerEmail: "owner@example.com",
      }),
      user: {
        id: 7,
        email: "owner@example.com",
        created: false,
      },
    });
    expect(mockedCreateTeamForUserAsSuperAdmin).toHaveBeenCalledWith({
      requestUserId: 99,
      payload,
    });
  });

  it("maps service errors", async () => {
    mockedCreateTeamForUserAsSuperAdmin.mockResolvedValue({
      ok: false,
      error: {
        status: 403,
        errorCode: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        error: "Super admin access required",
      },
    });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/admin/users/team", {
        method: "POST",
        body: JSON.stringify({ email: "owner@example.com", teamName: "Acme" }),
        headers: { "content-type": "application/json" },
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
      error: "Super admin access required",
    });
  });

  it("passes null payload to service when request JSON is invalid", async () => {
    mockedCreateTeamForUserAsSuperAdmin.mockResolvedValue({
      ok: false,
      error: {
        status: 400,
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        error: "Invalid request payload",
      },
    });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/admin/users/team", {
        method: "POST",
        body: "{",
        headers: { "content-type": "application/json" },
      })
    );

    expect(response.status).toBe(400);
    expect(mockedCreateTeamForUserAsSuperAdmin).toHaveBeenCalledWith({
      requestUserId: 99,
      payload: null,
    });
  });
});
