import { vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/teams/[id]/items/[itemId]/transactions/route";
import { ERROR_CODES } from "@/lib/errors";

vi.mock("@/lib/services/transactions", () => ({
  listItemTransactionsForUser: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({
  getUserIdFromRequest: vi.fn(),
  authorizeTeamAccess: vi.fn(),
}));

import { listItemTransactionsForUser } from "@/lib/services/transactions";
import { authorizeTeamAccess, getUserIdFromRequest } from "@/lib/permissions";

const mockedListItemTransactionsForUser = vi.mocked(listItemTransactionsForUser);
const mockedGetUserIdFromRequest = vi.mocked(getUserIdFromRequest);
const mockedAuthorizeTeamAccess = vi.mocked(authorizeTeamAccess);

describe("/api/teams/[id]/items/[itemId]/transactions route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetUserIdFromRequest.mockReturnValue(31);
    mockedAuthorizeTeamAccess.mockResolvedValue({
      ok: true,
      team: {
        id: 12,
        stripeSubscriptionStatus: "active",
        manualTrialEndsAt: null,
      } as never,
      user: { id: 31 } as never,
      teamRole: "admin",
    });
  });

  it("returns 400 for invalid route ids", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/teams/x/items/y/transactions"),
      { params: Promise.resolve({ id: "x", itemId: "y" }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      error: "Invalid team ID or item ID",
    });
    expect(mockedListItemTransactionsForUser).not.toHaveBeenCalled();
  });

  it("returns item transactions on success", async () => {
    mockedListItemTransactionsForUser.mockResolvedValue({
      ok: true,
      data: {
        transactions: [{ id: 71, quantity: 2 }],
      },
    } as any);

    const request = new NextRequest("http://localhost:3000/api/teams/12/items/7/transactions");
    const response = await GET(request, {
      params: Promise.resolve({ id: "12", itemId: "7" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      transactions: [{ id: 71, quantity: 2 }],
    });
    expect(mockedListItemTransactionsForUser).toHaveBeenCalledWith({
      teamId: 12,
      itemId: 7,
      requestUserId: 31,
    });
    expect(mockedGetUserIdFromRequest).toHaveBeenCalledWith(request);
  });

  it("maps service errors", async () => {
    mockedListItemTransactionsForUser.mockResolvedValue({
      ok: false,
      error: {
        status: 404,
        errorCode: ERROR_CODES.ITEM_NOT_FOUND,
        error: "Item not found",
      },
    });

    const response = await GET(
      new NextRequest("http://localhost:3000/api/teams/12/items/7/transactions"),
      { params: Promise.resolve({ id: "12", itemId: "7" }) }
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.ITEM_NOT_FOUND,
      error: "Item not found",
    });
  });

  it("returns internal error when service throws", async () => {
    mockedListItemTransactionsForUser.mockRejectedValue(new Error("unexpected"));

    const response = await GET(
      new NextRequest("http://localhost:3000/api/teams/12/items/7/transactions"),
      { params: Promise.resolve({ id: "12", itemId: "7" }) }
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.INTERNAL_ERROR,
      error: "An error occurred while fetching transactions",
    });
  });
});
