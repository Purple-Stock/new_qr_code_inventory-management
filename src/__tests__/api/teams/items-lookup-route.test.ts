import { vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/teams/[id]/items/lookup/route";
import { ERROR_CODES } from "@/lib/errors";

vi.mock("@/lib/services/items", () => ({
  lookupTeamItemsByCodeForUser: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({
  getUserIdFromRequest: vi.fn(),
  authorizeTeamAccess: vi.fn(),
}));

import { lookupTeamItemsByCodeForUser } from "@/lib/services/items";
import { authorizeTeamAccess, getUserIdFromRequest } from "@/lib/permissions";

const mockedLookupTeamItemsByCodeForUser = vi.mocked(lookupTeamItemsByCodeForUser);
const mockedGetUserIdFromRequest = vi.mocked(getUserIdFromRequest);
const mockedAuthorizeTeamAccess = vi.mocked(authorizeTeamAccess);

describe("/api/teams/[id]/items/lookup route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetUserIdFromRequest.mockReturnValue(5);
    mockedAuthorizeTeamAccess.mockResolvedValue({
      ok: true,
      team: {
        id: 12,
        stripeSubscriptionStatus: "active",
        manualTrialEndsAt: null,
      } as never,
      user: { id: 5 } as never,
      teamRole: "admin",
    });
  });

  it("returns 400 for invalid team id", async () => {
    const response = await GET(new NextRequest("http://localhost:3000/api/teams/abc/items/lookup?code=ABC"), {
      params: Promise.resolve({ id: "abc" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      error: "Invalid team ID",
    });
    expect(mockedLookupTeamItemsByCodeForUser).not.toHaveBeenCalled();
  });

  it("returns 400 when code is missing", async () => {
    const response = await GET(new NextRequest("http://localhost:3000/api/teams/12/items/lookup"), {
      params: Promise.resolve({ id: "12" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      error: "Code is required",
    });
    expect(mockedLookupTeamItemsByCodeForUser).not.toHaveBeenCalled();
  });

  it("returns items when service succeeds", async () => {
    mockedLookupTeamItemsByCodeForUser.mockResolvedValue({
      ok: true,
      data: {
        items: [
          {
            id: 10,
            name: "Machine A",
            sku: "MA-1",
            barcode: "ABC-123",
            currentStock: 3,
            locationName: "Setor A",
          },
        ],
      },
    });

    const request = new NextRequest("http://localhost:3000/api/teams/12/items/lookup?code=ABC-123");
    const response = await GET(request, {
      params: Promise.resolve({ id: "12" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [
        {
          id: 10,
          name: "Machine A",
          sku: "MA-1",
          barcode: "ABC-123",
          currentStock: 3,
          locationName: "Setor A",
        },
      ],
    });
    expect(mockedLookupTeamItemsByCodeForUser).toHaveBeenCalledWith({
      teamId: 12,
      code: "ABC-123",
      requestUserId: 5,
    });
    expect(mockedGetUserIdFromRequest).toHaveBeenCalledWith(request);
  });

  it("maps service errors", async () => {
    mockedLookupTeamItemsByCodeForUser.mockResolvedValue({
      ok: false,
      error: {
        status: 403,
        errorCode: ERROR_CODES.FORBIDDEN,
        error: "Forbidden",
      },
    });

    const response = await GET(new NextRequest("http://localhost:3000/api/teams/12/items/lookup?code=ABC"), {
      params: Promise.resolve({ id: "12" }),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.FORBIDDEN,
      error: "Forbidden",
    });
  });

  it("returns 403 when subscription is inactive", async () => {
    mockedAuthorizeTeamAccess.mockResolvedValue({
      ok: true,
      team: {
        id: 12,
        stripeSubscriptionStatus: null,
        manualTrialEndsAt: null,
      } as never,
      user: { id: 5 } as never,
      teamRole: "admin",
    });

    const response = await GET(new NextRequest("http://localhost:3000/api/teams/12/items/lookup?code=ABC"), {
      params: Promise.resolve({ id: "12" }),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.FORBIDDEN,
      error: "Active subscription required",
    });
    expect(mockedLookupTeamItemsByCodeForUser).not.toHaveBeenCalled();
  });
});
