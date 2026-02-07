import {
  listItemTransactionsForUser,
  listTeamTransactionsForUser,
} from "@/lib/services/transactions";
import { ERROR_CODES } from "@/lib/errors";
import { authorizeTeamAccess } from "@/lib/permissions";
import {
  getItemStockTransactionsWithDetails,
  getTeamStockTransactionsWithDetails,
} from "@/lib/db/stock-transactions";
import { getItemById } from "@/lib/db/items";

jest.mock("@/lib/permissions", () => ({
  authorizeTeamAccess: jest.fn(),
}));

jest.mock("@/lib/db/stock-transactions", () => ({
  getItemStockTransactionsWithDetails: jest.fn(),
  getTeamStockTransactionsWithDetails: jest.fn(),
}));

jest.mock("@/lib/db/items", () => ({
  getItemById: jest.fn(),
}));

const mockAuthorizeTeamAccess = authorizeTeamAccess as jest.MockedFunction<
  typeof authorizeTeamAccess
>;
const mockGetTeamTransactions = getTeamStockTransactionsWithDetails as jest.MockedFunction<
  typeof getTeamStockTransactionsWithDetails
>;
const mockGetItemTransactions = getItemStockTransactionsWithDetails as jest.MockedFunction<
  typeof getItemStockTransactionsWithDetails
>;
const mockGetItemById = getItemById as jest.MockedFunction<typeof getItemById>;

describe("transactions service", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns auth error when team access fails", async () => {
    mockAuthorizeTeamAccess.mockResolvedValue({
      ok: false,
      status: 401,
      error: "User not authenticated",
    });

    const result = await listTeamTransactionsForUser({
      teamId: 1,
      requestUserId: null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(401);
    expect(result.error.errorCode).toBe(ERROR_CODES.USER_NOT_AUTHENTICATED);
  });

  it("lists team transactions on success", async () => {
    mockAuthorizeTeamAccess.mockResolvedValue({
      ok: true,
      team: {} as never,
      user: {} as never,
      teamRole: "admin",
    });
    mockGetTeamTransactions.mockResolvedValue([
      {
        id: 10,
        itemId: 5,
        teamId: 1,
        transactionType: "stock_in",
        quantity: 2,
        notes: null,
        userId: 7,
        sourceLocationId: null,
        destinationLocationId: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        item: { id: 5, name: "Item", sku: "SKU", barcode: "BAR" },
        user: { id: 7, email: "x@example.com" },
        sourceLocation: null,
        destinationLocation: null,
      },
    ]);

    const result = await listTeamTransactionsForUser({
      teamId: 1,
      requestUserId: 7,
      searchQuery: "item",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.transactions).toHaveLength(1);
    expect(result.data.transactions[0].createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("returns not found when item does not exist", async () => {
    mockAuthorizeTeamAccess.mockResolvedValue({
      ok: true,
      team: {} as never,
      user: {} as never,
      teamRole: "admin",
    });
    mockGetItemById.mockResolvedValue(null);

    const result = await listItemTransactionsForUser({
      teamId: 1,
      itemId: 999,
      requestUserId: 7,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(404);
    expect(result.error.errorCode).toBe(ERROR_CODES.ITEM_NOT_FOUND);
  });

  it("returns forbidden when item belongs to another team", async () => {
    mockAuthorizeTeamAccess.mockResolvedValue({
      ok: true,
      team: {} as never,
      user: {} as never,
      teamRole: "admin",
    });
    mockGetItemById.mockResolvedValue({ id: 2, teamId: 99 } as never);

    const result = await listItemTransactionsForUser({
      teamId: 1,
      itemId: 2,
      requestUserId: 7,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(403);
    expect(result.error.errorCode).toBe(ERROR_CODES.FORBIDDEN);
  });
});
