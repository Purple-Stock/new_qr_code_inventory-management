import { vi } from "vitest";
import {
  getItemDetailsData,
  getTeamLocationsData,
  getTeamReportsData,
  getTeamTransactionsData,
} from "@/lib/services/team-dashboard";
import { getTeamWithStats } from "@/lib/db/teams";
import { getTeamItems, getItemByIdWithLocation } from "@/lib/db/items";
import { getLocationById, getTeamLocations } from "@/lib/db/locations";
import { getTeamReportStats } from "@/lib/db/reports";
import {
  getItemStockTransactionsWithDetails,
  getTeamStockTransactionsWithDetails,
} from "@/lib/db/stock-transactions";

vi.mock("@/lib/db/teams", () => ({
  getTeamWithStats: vi.fn(),
}));
vi.mock("@/lib/db/items", () => ({
  getTeamItems: vi.fn(),
  getItemByIdWithLocation: vi.fn(),
}));
vi.mock("@/lib/db/locations", () => ({
  getLocationById: vi.fn(),
  getTeamLocations: vi.fn(),
}));
vi.mock("@/lib/db/reports", () => ({
  getTeamReportStats: vi.fn(),
}));
vi.mock("@/lib/db/stock-transactions", () => ({
  getItemStockTransactionsWithDetails: vi.fn(),
  getTeamStockTransactionsWithDetails: vi.fn(),
}));

const mockGetTeamWithStats = getTeamWithStats as vi.MockedFunction<typeof getTeamWithStats>;
const mockGetTeamItems = getTeamItems as vi.MockedFunction<typeof getTeamItems>;
const mockGetItemByIdWithLocation = getItemByIdWithLocation as vi.MockedFunction<
  typeof getItemByIdWithLocation
>;
const mockGetLocationById = getLocationById as vi.MockedFunction<typeof getLocationById>;
const mockGetTeamLocations = getTeamLocations as vi.MockedFunction<typeof getTeamLocations>;
const mockGetTeamReportStats = getTeamReportStats as vi.MockedFunction<typeof getTeamReportStats>;
const mockGetItemTransactions =
  getItemStockTransactionsWithDetails as vi.MockedFunction<
    typeof getItemStockTransactionsWithDetails
  >;
const mockGetTeamTransactions =
  getTeamStockTransactionsWithDetails as vi.MockedFunction<
    typeof getTeamStockTransactionsWithDetails
  >;

describe("team-dashboard service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetTeamWithStats.mockResolvedValue({
      id: 1,
      name: "Team",
      notes: null,
      userId: 7,
      companyId: null,
      stripeCustomerId: "cus_test",
      stripeSubscriptionId: "sub_test",
      stripeSubscriptionStatus: "active",
      stripePriceId: "price_test",
      stripeCurrentPeriodEnd: new Date("2026-12-31T00:00:00.000Z"),
      itemCount: 0,
      transactionCount: 0,
      memberCount: 1,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    } as never);
  });

  it("returns team report data with dto mapping", async () => {
    mockGetTeamReportStats.mockResolvedValue({
      totalItems: 0,
      totalLocations: 0,
      totalTransactions: 0,
      totalStockValue: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      transactionsByType: { stock_in: 0, stock_out: 0, adjust: 0, move: 0 },
      recentTransactions: [],
      topItemsByValue: [],
      stockByLocation: [],
      transactionsByDate: [],
    });

    const result = await getTeamReportsData(1);

    expect(result.team?.id).toBe(1);
    expect(result.stats.totalItems).toBe(0);
  });

  it("returns null item when item does not belong to team", async () => {
    mockGetItemByIdWithLocation.mockResolvedValue({
      id: 10,
      teamId: 99,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    mockGetItemTransactions.mockResolvedValue([]);

    const result = await getItemDetailsData(1, 10);

    expect(result.item).toBeNull();
    expect(result.transactions).toEqual([]);
  });

  it("returns team transactions dto list", async () => {
    mockGetTeamTransactions.mockResolvedValue([
      {
        id: 1,
        itemId: 2,
        teamId: 1,
        transactionType: "stock_in",
        quantity: 5,
        notes: null,
        userId: 7,
        sourceLocationId: null,
        destinationLocationId: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        item: null,
        user: null,
        sourceLocation: null,
        destinationLocation: null,
      },
    ]);

    const result = await getTeamTransactionsData(1);
    expect(result.team?.id).toBe(1);
    expect(result.transactions[0].createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("returns team locations mapped", async () => {
    mockGetTeamLocations.mockResolvedValue([
      {
        id: 3,
        name: "Main",
        description: null,
        teamId: 1,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as never);
    mockGetTeamItems.mockResolvedValue([]);
    mockGetLocationById.mockResolvedValue(null);

    const result = await getTeamLocationsData(1);
    expect(result.locations).toHaveLength(1);
    expect(result.locations[0].name).toBe("Main");
  });

  it("treats manual trial as active access when Stripe is inactive", async () => {
    mockGetTeamWithStats.mockResolvedValue({
      id: 1,
      name: "Team",
      notes: null,
      userId: 7,
      companyId: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripeSubscriptionStatus: null,
      stripePriceId: null,
      stripeCurrentPeriodEnd: null,
      manualTrialEndsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      manualTrialGrantsCount: 1,
      manualTrialLastGrantedAt: new Date(),
      itemCount: 0,
      transactionCount: 0,
      memberCount: 1,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    } as never);
    mockGetTeamReportStats.mockResolvedValue({
      totalItems: 0,
      totalLocations: 0,
      totalTransactions: 0,
      totalStockValue: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      transactionsByType: { stock_in: 0, stock_out: 0, adjust: 0, move: 0 },
      recentTransactions: [],
      topItemsByValue: [],
      stockByLocation: [],
      transactionsByDate: [],
    });

    const result = await getTeamReportsData(1);

    expect(result.subscriptionRequired).toBe(false);
    expect(result.team?.id).toBe(1);
  });
});
