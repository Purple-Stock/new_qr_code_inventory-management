import { NextRequest } from "next/server";
import { GET } from "@/app/api/teams/[id]/transactions/route";
import { ERROR_CODES } from "@/lib/errors";

jest.mock("@/lib/services/transactions", () => ({
  listTeamTransactionsForUser: jest.fn(),
}));

jest.mock("@/lib/permissions", () => ({
  getUserIdFromRequest: jest.fn(),
}));

import { listTeamTransactionsForUser } from "@/lib/services/transactions";
import { getUserIdFromRequest } from "@/lib/permissions";

const mockedListTeamTransactionsForUser = jest.mocked(listTeamTransactionsForUser);
const mockedGetUserIdFromRequest = jest.mocked(getUserIdFromRequest);

describe("/api/teams/[id]/transactions route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetUserIdFromRequest.mockReturnValue(15);
  });

  it("returns 400 for invalid team id", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/teams/abc/transactions"),
      { params: Promise.resolve({ id: "abc" }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      error: "Invalid team ID",
    });
    expect(mockedListTeamTransactionsForUser).not.toHaveBeenCalled();
  });

  it("returns transactions when service succeeds", async () => {
    mockedListTeamTransactionsForUser.mockResolvedValue({
      ok: true,
      data: {
        transactions: [{ id: 10, quantity: 5 }],
      },
    } as any);

    const request = new NextRequest("http://localhost:3000/api/teams/12/transactions?search=mouse");
    const response = await GET(request, {
      params: Promise.resolve({ id: "12" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ transactions: [{ id: 10, quantity: 5 }] });
    expect(mockedListTeamTransactionsForUser).toHaveBeenCalledWith({
      teamId: 12,
      requestUserId: 15,
      searchQuery: "mouse",
    });
    expect(mockedGetUserIdFromRequest).toHaveBeenCalledWith(request);
  });

  it("passes undefined search query when absent", async () => {
    mockedListTeamTransactionsForUser.mockResolvedValue({
      ok: true,
      data: { transactions: [] },
    } as any);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/teams/12/transactions"),
      { params: Promise.resolve({ id: "12" }) }
    );

    expect(response.status).toBe(200);
    expect(mockedListTeamTransactionsForUser).toHaveBeenCalledWith({
      teamId: 12,
      requestUserId: 15,
      searchQuery: undefined,
    });
  });

  it("maps service errors", async () => {
    mockedListTeamTransactionsForUser.mockResolvedValue({
      ok: false,
      error: {
        status: 403,
        errorCode: ERROR_CODES.FORBIDDEN,
        error: "Forbidden",
      },
    });

    const response = await GET(
      new NextRequest("http://localhost:3000/api/teams/12/transactions"),
      { params: Promise.resolve({ id: "12" }) }
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.FORBIDDEN,
      error: "Forbidden",
    });
  });

  it("returns internal error when service throws", async () => {
    mockedListTeamTransactionsForUser.mockRejectedValue(new Error("db down"));

    const response = await GET(
      new NextRequest("http://localhost:3000/api/teams/12/transactions"),
      { params: Promise.resolve({ id: "12" }) }
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.INTERNAL_ERROR,
      error: "db down",
    });
  });
});
