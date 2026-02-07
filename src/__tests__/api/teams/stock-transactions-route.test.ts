import { NextRequest } from "next/server";
import { POST } from "@/app/api/teams/[id]/stock-transactions/route";
import { ERROR_CODES } from "@/lib/errors";

jest.mock("@/lib/services/stock-transactions", () => ({
  createTeamStockTransaction: jest.fn(),
}));

jest.mock("@/lib/permissions", () => ({
  getUserIdFromRequest: jest.fn(),
}));

import { createTeamStockTransaction } from "@/lib/services/stock-transactions";
import { getUserIdFromRequest } from "@/lib/permissions";

const mockedCreateTeamStockTransaction = jest.mocked(createTeamStockTransaction);
const mockedGetUserIdFromRequest = jest.mocked(getUserIdFromRequest);

describe("/api/teams/[id]/stock-transactions route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetUserIdFromRequest.mockReturnValue(31);
  });

  it("returns 400 for invalid team id", async () => {
    const request = new NextRequest("http://localhost:3000/api/teams/abc/stock-transactions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transactionType: "stock_in", itemId: 1, quantity: 5 }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: "abc" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      error: "Invalid team ID",
    });
    expect(mockedCreateTeamStockTransaction).not.toHaveBeenCalled();
  });

  it("creates stock transaction and returns 201", async () => {
    mockedCreateTeamStockTransaction.mockResolvedValue({
      ok: true,
      data: {
        transaction: { id: 99, itemId: 1, quantity: 5 },
      },
    } as any);

    const request = new NextRequest("http://localhost:3000/api/teams/12/stock-transactions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transactionType: "stock_in", itemId: 1, quantity: 5 }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: "12" }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      message: "Stock transaction created successfully",
      transaction: { id: 99, itemId: 1, quantity: 5 },
    });
    expect(mockedCreateTeamStockTransaction).toHaveBeenCalledWith({
      teamId: 12,
      requestUserId: 31,
      payload: { transactionType: "stock_in", itemId: 1, quantity: 5 },
    });
    expect(mockedGetUserIdFromRequest).toHaveBeenCalledWith(request);
  });

  it("maps service errors", async () => {
    mockedCreateTeamStockTransaction.mockResolvedValue({
      ok: false,
      error: {
        status: 400,
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        error: "Quantity must be greater than 0",
      },
    });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/teams/12/stock-transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transactionType: "stock_in", itemId: 1, quantity: 0 }),
      }),
      { params: Promise.resolve({ id: "12" }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      error: "Quantity must be greater than 0",
    });
  });

  it("returns internal error for malformed json", async () => {
    const response = await POST(
      new NextRequest("http://localhost:3000/api/teams/12/stock-transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{invalid",
      }),
      { params: Promise.resolve({ id: "12" }) }
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.INTERNAL_ERROR,
      error: "Expected property name or '}' in JSON at position 1 (line 1 column 2)",
    });
    expect(mockedCreateTeamStockTransaction).not.toHaveBeenCalled();
  });
});
