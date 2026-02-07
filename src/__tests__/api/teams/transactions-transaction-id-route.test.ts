import { NextRequest } from "next/server";
import { DELETE } from "@/app/api/teams/[id]/transactions/[transactionId]/route";
import { ERROR_CODES } from "@/lib/errors";

jest.mock("@/lib/services/stock-transactions", () => ({
  deleteTeamTransaction: jest.fn(),
}));

jest.mock("@/lib/permissions", () => ({
  getUserIdFromRequest: jest.fn(),
}));

import { deleteTeamTransaction } from "@/lib/services/stock-transactions";
import { getUserIdFromRequest } from "@/lib/permissions";

const mockedDeleteTeamTransaction = jest.mocked(deleteTeamTransaction);
const mockedGetUserIdFromRequest = jest.mocked(getUserIdFromRequest);

describe("/api/teams/[id]/transactions/[transactionId] route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetUserIdFromRequest.mockReturnValue(15);
  });

  it("returns 400 for invalid route ids", async () => {
    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/teams/a/transactions/b", { method: "DELETE" }),
      { params: Promise.resolve({ id: "a", transactionId: "b" }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      error: "Invalid team ID or transaction ID",
    });
    expect(mockedDeleteTeamTransaction).not.toHaveBeenCalled();
  });

  it("deletes transaction on success", async () => {
    mockedDeleteTeamTransaction.mockResolvedValue({ ok: true, data: null } as any);

    const request = new NextRequest("http://localhost:3000/api/teams/12/transactions/55", {
      method: "DELETE",
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "12", transactionId: "55" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "Transaction deleted successfully" });
    expect(mockedDeleteTeamTransaction).toHaveBeenCalledWith({
      teamId: 12,
      transactionId: 55,
      requestUserId: 15,
    });
    expect(mockedGetUserIdFromRequest).toHaveBeenCalledWith(request);
  });

  it("maps service errors", async () => {
    mockedDeleteTeamTransaction.mockResolvedValue({
      ok: false,
      error: {
        status: 404,
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        error: "Transaction not found",
      },
    });

    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/teams/12/transactions/55", { method: "DELETE" }),
      { params: Promise.resolve({ id: "12", transactionId: "55" }) }
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      error: "Transaction not found",
    });
  });

  it("returns internal error when service throws", async () => {
    mockedDeleteTeamTransaction.mockRejectedValue(new Error("delete failed"));

    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/teams/12/transactions/55", { method: "DELETE" }),
      { params: Promise.resolve({ id: "12", transactionId: "55" }) }
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.INTERNAL_ERROR,
      error: "delete failed",
    });
  });
});
