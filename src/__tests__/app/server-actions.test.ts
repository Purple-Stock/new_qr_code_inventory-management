import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ERROR_CODES } from "@/lib/errors";
import { getUserIdFromSessionToken } from "@/lib/session";
import {
  createTeamStockTransaction,
  deleteTeamTransaction,
} from "@/lib/services/stock-transactions";
import { deleteTeamLocation } from "@/lib/services/locations";
import { createTeamItem } from "@/lib/services/items";
import { createStockInAction } from "@/app/teams/[id]/stock-in/_actions/createStockTransaction";
import { createStockOutAction } from "@/app/teams/[id]/stock-out/_actions/createStockTransaction";
import { createAdjustAction } from "@/app/teams/[id]/adjust/_actions/createStockTransaction";
import { createMoveAction } from "@/app/teams/[id]/move/_actions/createStockTransaction";
import { deleteTransactionAction } from "@/app/teams/[id]/transactions/_actions/deleteTransaction";
import { deleteLocationAction } from "@/app/teams/[id]/locations/_actions/deleteLocation";
import { createItemAction } from "@/app/teams/[id]/items/_actions/createItem";

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("@/lib/session", () => ({
  SESSION_COOKIE_NAME: "session",
  getUserIdFromSessionToken: jest.fn(),
}));

jest.mock("@/lib/services/stock-transactions", () => ({
  createTeamStockTransaction: jest.fn(),
  deleteTeamTransaction: jest.fn(),
}));

jest.mock("@/lib/services/locations", () => ({
  deleteTeamLocation: jest.fn(),
}));

jest.mock("@/lib/services/items", () => ({
  createTeamItem: jest.fn(),
}));

const mockedRevalidatePath = jest.mocked(revalidatePath);
const mockedCookies = jest.mocked(cookies);
const mockedGetUserIdFromSessionToken = jest.mocked(getUserIdFromSessionToken);
const mockedCreateTeamStockTransaction = jest.mocked(createTeamStockTransaction);
const mockedDeleteTeamTransaction = jest.mocked(deleteTeamTransaction);
const mockedDeleteTeamLocation = jest.mocked(deleteTeamLocation);
const mockedCreateTeamItem = jest.mocked(createTeamItem);

const STOCK_BASE_PAYLOAD = {
  itemId: 1,
  quantity: 5,
  locationId: 2,
  notes: "note",
};

describe("server actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCookies.mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: "token-123" }),
    } as any);
    mockedGetUserIdFromSessionToken.mockReturnValue(77);
  });

  it("createStockInAction returns success and revalidates expected paths", async () => {
    mockedCreateTeamStockTransaction.mockResolvedValue({
      ok: true,
      data: { transaction: { id: 10 } },
    } as any);

    const result = await createStockInAction(9, STOCK_BASE_PAYLOAD);

    expect(result).toEqual({ success: true, transaction: { id: 10 } });
    expect(mockedCreateTeamStockTransaction).toHaveBeenCalledWith({
      teamId: 9,
      requestUserId: 77,
      payload: { ...STOCK_BASE_PAYLOAD, transactionType: "stock_in" },
    });
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/teams/9/stock-in");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/teams/9/items");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/teams/9/transactions");
  });

  it("createStockOutAction maps service error", async () => {
    mockedCreateTeamStockTransaction.mockResolvedValue({
      ok: false,
      error: {
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        error: "Invalid payload",
      },
    } as any);

    const result = await createStockOutAction(9, STOCK_BASE_PAYLOAD);

    expect(result).toEqual({
      success: false,
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      error: "Invalid payload",
    });
    expect(mockedRevalidatePath).not.toHaveBeenCalled();
  });

  it("createAdjustAction handles thrown errors", async () => {
    mockedCreateTeamStockTransaction.mockRejectedValue(new Error("boom"));

    const result = await createAdjustAction(9, STOCK_BASE_PAYLOAD);

    expect(result).toEqual({
      success: false,
      errorCode: ERROR_CODES.INTERNAL_ERROR,
      error: "boom",
    });
  });

  it("createMoveAction revalidates stock-by-location", async () => {
    mockedCreateTeamStockTransaction.mockResolvedValue({
      ok: true,
      data: { transaction: { id: 11 } },
    } as any);

    const result = await createMoveAction(9, {
      itemId: 1,
      quantity: 2,
      sourceLocationId: 4,
      destinationLocationId: 5,
      notes: null,
    });

    expect(result).toEqual({ success: true, transaction: { id: 11 } });
    expect(mockedCreateTeamStockTransaction).toHaveBeenCalledWith({
      teamId: 9,
      requestUserId: 77,
      payload: {
        itemId: 1,
        quantity: 2,
        sourceLocationId: 4,
        destinationLocationId: 5,
        notes: null,
        transactionType: "move",
      },
    });
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/teams/9/move");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/teams/9/items");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/teams/9/transactions");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/teams/9/stock-by-location");
  });

  it("deleteTransactionAction returns success and revalidates pages", async () => {
    mockedDeleteTeamTransaction.mockResolvedValue({ ok: true, data: null } as any);

    const result = await deleteTransactionAction(9, 41);

    expect(result).toEqual({ success: true });
    expect(mockedDeleteTeamTransaction).toHaveBeenCalledWith({
      teamId: 9,
      transactionId: 41,
      requestUserId: 77,
    });
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/teams/9/transactions");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/teams/9/items");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/teams/9/reports");
  });

  it("deleteLocationAction maps service errors", async () => {
    mockedDeleteTeamLocation.mockResolvedValue({
      ok: false,
      error: {
        errorCode: ERROR_CODES.LOCATION_NOT_FOUND,
        error: "Location not found",
      },
    } as any);

    const result = await deleteLocationAction(9, 5);

    expect(result).toEqual({
      success: false,
      errorCode: ERROR_CODES.LOCATION_NOT_FOUND,
      error: "Location not found",
    });
    expect(mockedRevalidatePath).not.toHaveBeenCalled();
  });

  it("createItemAction returns success and item", async () => {
    mockedCreateTeamItem.mockResolvedValue({
      ok: true,
      data: { item: { id: 99, name: "Keyboard" } },
    } as any);

    const result = await createItemAction(9, {
      name: "Keyboard",
      barcode: "123",
      initialQuantity: 10,
    });

    expect(result).toEqual({
      success: true,
      item: { id: 99, name: "Keyboard" },
    });
    expect(mockedCreateTeamItem).toHaveBeenCalledWith({
      teamId: 9,
      requestUserId: 77,
      payload: {
        name: "Keyboard",
        barcode: "123",
        initialQuantity: 10,
      },
    });
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/teams/9/items");
  });

  it("createItemAction handles thrown errors", async () => {
    mockedCreateTeamItem.mockRejectedValue(new Error("failed"));

    const result = await createItemAction(9, {
      name: "Keyboard",
      barcode: "123",
    });

    expect(result).toEqual({
      success: false,
      errorCode: ERROR_CODES.INTERNAL_ERROR,
      error: "failed",
    });
  });
});
