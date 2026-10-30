import { vi } from "vitest";
import {
  getItemDetailsData,
  getTeamItemEditData,
  getTeamItemsData,
  getTeamLocationsData,
  getTeamReportsData,
  getTeamStockByLocationData,
  getTeamStockOperationData,
  getTeamTransactionsData,
} from "@/lib/services/team-dashboard";
import { getTeamWithStats } from "@/lib/db/teams";
import { getTeamItems, getItemByIdWithLocation } from "@/lib/db/items";
import { getLocationById, getTeamLocations } from "@/lib/db/locations";
import { getTeamReportStats } from "@/lib/db/reports";
import { getActiveTeamMemberRole, getCompanyTeams } from "@/lib/db/team-members";
import {
  getItemStockTransactionsWithDetails,
  getTeamStockTransactionsWithDetails,
} from "@/lib/db/stock-transactions";
import { getItemStocksForTeam } from "@/lib/db/item-stocks";

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
vi.mock("@/lib/db/team-members", () => ({
  getCompanyTeams: vi.fn(),
  getActiveTeamMemberRole: vi.fn(),
}));
vi.mock("@/lib/db/stock-transactions", () => ({
  getItemStockTransactionsWithDetails: vi.fn(),
  getTeamStockTransactionsWithDetails: vi.fn(),
}));
vi.mock("@/lib/db/item-stocks", () => ({
  getItemStocksForTeam: vi.fn(),
}));

const mockGetTeamWithStats = getTeamWithStats as vi.MockedFunction<typeof getTeamWithStats>;
const mockGetTeamItems = getTeamItems as vi.MockedFunction<typeof getTeamItems>;
const mockGetItemByIdWithLocation = getItemByIdWithLocation as vi.MockedFunction<
  typeof getItemByIdWithLocation
>;
const mockGetLocationById = getLocationById as vi.MockedFunction<typeof getLocationById>;
const mockGetTeamLocations = getTeamLocations as vi.MockedFunction<typeof getTeamLocations>;
const mockGetTeamReportStats = getTeamReportStats as vi.MockedFunction<typeof getTeamReportStats>;
const mockGetCompanyTeams = getCompanyTeams as vi.MockedFunction<typeof getCompanyTeams>;
const mockGetActiveTeamMemberRole = getActiveTeamMemberRole as vi.MockedFunction<
  typeof getActiveTeamMemberRole
>;
const mockGetItemTransactions =
  getItemStockTransactionsWithDetails as vi.MockedFunction<
    typeof getItemStockTransactionsWithDetails
  >;
const mockGetTeamTransactions =
  getTeamStockTransactionsWithDetails as vi.MockedFunction<
    typeof getTeamStockTransactionsWithDetails
  >;
const mockGetItemStocksForTeam = getItemStocksForTeam as vi.MockedFunction<
  typeof getItemStocksForTeam
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
    mockGetCompanyTeams.mockResolvedValue([]);
    mockGetActiveTeamMemberRole.mockResolvedValue("admin");
    mockGetTeamLocations.mockResolvedValue([]);
    mockGetTeamItems.mockResolvedValue([]);
    mockGetItemStocksForTeam.mockResolvedValue([]);
  });

  it("does not return item edit data without a session user", async () => {
    mockGetItemByIdWithLocation.mockResolvedValue({
      id: 10,
      teamId: 1,
      name: "Secret camera",
      barcode: "999",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const result = await getTeamItemEditData(1, 10);

    expect(result.team).toBeNull();
    expect(result.item).toBeNull();
    expect(mockGetItemByIdWithLocation).not.toHaveBeenCalled();
  });

  it("does not fetch report stats without a session user", async () => {
    const result = await getTeamReportsData(1);

    expect(result.team).toBeNull();
    expect(result.stats.recentTransactions).toEqual([]);
    expect(mockGetTeamReportStats).not.toHaveBeenCalled();
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

    const result = await getTeamReportsData(1, undefined, undefined, {
      requestUserId: 7,
    });

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

    const result = await getItemDetailsData(1, 10, { requestUserId: 7 });

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

    const result = await getTeamTransactionsData(1, undefined, 7);
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

    const result = await getTeamLocationsData(1, { requestUserId: 7 });
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

    const result = await getTeamReportsData(1, undefined, undefined, {
      requestUserId: 7,
    });

    expect(result.subscriptionRequired).toBe(false);
    expect(result.team?.id).toBe(1);
  });

  it("returns only active destination teams for stock operation data", async () => {
    mockGetTeamWithStats.mockResolvedValue({
      id: 1,
      name: "Source",
      notes: null,
      userId: 7,
      companyId: 77,
      stripeSubscriptionStatus: "active",
      manualTrialEndsAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    } as never);
    mockGetTeamLocations.mockResolvedValue([]);
    mockGetTeamItems.mockResolvedValue([]);
    mockGetCompanyTeams.mockResolvedValue([
      {
        id: 1,
        name: "Source",
        stripeSubscriptionStatus: "active",
        manualTrialEndsAt: null,
      },
      {
        id: 2,
        name: "Inactive Team",
        stripeSubscriptionStatus: "canceled",
        manualTrialEndsAt: null,
      },
      {
        id: 3,
        name: "Trial Team",
        stripeSubscriptionStatus: null,
        manualTrialEndsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    ] as never);

    const result = await getTeamStockOperationData(1, { requestUserId: 7 });

    expect(result.destinationTeams).toEqual([{ id: 3, name: "Trial Team" }]);
  });

  it("splits stock-by-location rows from item_stocks", async () => {
    mockGetTeamLocations.mockResolvedValue([
      {
        id: 1,
        name: "Local 1",
        description: null,
        teamId: 1,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: 3,
        name: "Local2",
        description: null,
        teamId: 1,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as never);
    mockGetTeamItems.mockResolvedValue([
      {
        id: 1,
        name: "Cadeira Azul",
        sku: "CADEIRA-AZUL",
        barcode: "5817915565817",
        currentStock: 20,
        initialQuantity: 0,
        locationId: 3,
        locationName: "Local2",
        teamId: 1,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as never);
    mockGetItemStocksForTeam.mockResolvedValue([
      { itemId: 1, locationId: 1, quantity: 12 },
      { itemId: 1, locationId: 3, quantity: 8 },
    ]);

    const result = await getTeamStockByLocationData(1, { requestUserId: 7 });

    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 1, locationId: 1, currentStock: 12 }),
        expect.objectContaining({ id: 1, locationId: 3, currentStock: 8 }),
      ])
    );
    expect(result.items).toHaveLength(2);
  });

  it("splits the items list from item_stocks", async () => {
    mockGetTeamLocations.mockResolvedValue([
      {
        id: 1,
        name: "Local 1",
        description: null,
        teamId: 1,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: 3,
        name: "Local2",
        description: null,
        teamId: 1,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as never);
    mockGetTeamItems.mockResolvedValue([
      {
        id: 1,
        name: "Cadeira Azul",
        sku: "CADEIRA-AZUL",
        barcode: "5817915565817",
        currentStock: 20,
        initialQuantity: 0,
        locationId: 3,
        locationName: "Local2",
        teamId: 1,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as never);
    mockGetItemStocksForTeam.mockResolvedValue([
      { itemId: 1, locationId: 1, quantity: 12 },
      { itemId: 1, locationId: 3, quantity: 8 },
    ]);

    const result = await getTeamItemsData(1, { requestUserId: 7 });

    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1,
          locationId: 1,
          locationName: "Local 1",
          currentStock: 12,
        }),
        expect.objectContaining({
          id: 1,
          locationId: 3,
          locationName: "Local2",
          currentStock: 8,
        }),
      ])
    );
    expect(result.items).toHaveLength(2);
  });

  it("shows one catalog SKU with summed stock on stock operations", async () => {
    mockGetTeamLocations.mockResolvedValue([
      {
        id: 1,
        name: "Local 1",
        description: null,
        teamId: 1,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: 3,
        name: "Local2",
        description: null,
        teamId: 1,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as never);
    mockGetTeamItems.mockResolvedValue([
      {
        id: 1,
        name: "Cadeira Azul",
        sku: "CADEIRA-AZUL",
        currentStock: 20,
        initialQuantity: 0,
        locationId: 3,
        locationName: "Local2",
        teamId: 1,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as never);
    mockGetItemStocksForTeam.mockResolvedValue([
      { itemId: 1, locationId: 1, quantity: 12 },
      { itemId: 1, locationId: 3, quantity: 8 },
    ]);

    const result = await getTeamStockOperationData(1, { requestUserId: 7 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({ id: 1, currentStock: 20 })
    );
  });

  it("splits stock-operation items when MOVE asks for bins", async () => {
    mockGetTeamLocations.mockResolvedValue([
      {
        id: 1,
        name: "Local 1",
        description: null,
        teamId: 1,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: 3,
        name: "Local2",
        description: null,
        teamId: 1,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as never);
    mockGetTeamItems.mockResolvedValue([
      {
        id: 1,
        name: "Cadeira Azul",
        sku: "CADEIRA-AZUL",
        currentStock: 20,
        initialQuantity: 0,
        locationId: 3,
        locationName: "Local2",
        teamId: 1,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as never);
    mockGetItemStocksForTeam.mockResolvedValue([
      { itemId: 1, locationId: 1, quantity: 12 },
      { itemId: 1, locationId: 3, quantity: 8 },
    ]);

    const result = await getTeamStockOperationData(1, {
      requestUserId: 7,
      splitItemsByLocation: true,
    });

    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 1, locationId: 1, currentStock: 12 }),
        expect.objectContaining({ id: 1, locationId: 3, currentStock: 8 }),
      ])
    );
  });

  it("rebuilds report stockByLocation from item_stocks", async () => {
    mockGetTeamReportStats.mockResolvedValue({
      totalItems: 1,
      totalLocations: 2,
      totalTransactions: 2,
      totalStockValue: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      transactionsByType: { stock_in: 1, stock_out: 0, adjust: 0, move: 1 },
      recentTransactions: [],
      topItemsByValue: [],
      stockByLocation: [
        {
          locationId: 3,
          locationName: "Local2",
          itemCount: 1,
          totalStock: 20,
          totalValue: 0,
        },
      ],
      transactionsByDate: [],
    });
    mockGetTeamLocations.mockResolvedValue([
      {
        id: 1,
        name: "Local 1",
        description: null,
        teamId: 1,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: 3,
        name: "Local2",
        description: null,
        teamId: 1,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as never);
    mockGetTeamItems.mockResolvedValue([
      {
        id: 1,
        name: "Cadeira Azul",
        sku: "CADEIRA-AZUL",
        barcode: "5817915565817",
        currentStock: 20,
        initialQuantity: 0,
        price: 0,
        locationId: 3,
        locationName: "Local2",
        teamId: 1,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as never);
    mockGetItemStocksForTeam.mockResolvedValue([
      { itemId: 1, locationId: 1, quantity: 12 },
      { itemId: 1, locationId: 3, quantity: 8 },
    ]);

    const result = await getTeamReportsData(1, undefined, undefined, {
      requestUserId: 7,
    });

    expect(result.stats.stockByLocation).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          locationId: 1,
          locationName: "Local 1",
          itemCount: 1,
          totalStock: 12,
        }),
        expect.objectContaining({
          locationId: 3,
          locationName: "Local2",
          itemCount: 1,
          totalStock: 8,
        }),
      ])
    );
  });
});
