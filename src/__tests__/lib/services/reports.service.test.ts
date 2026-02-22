import { vi } from "vitest";
import { getTeamReportStatsForUser } from "@/lib/services/reports";
import { authorizeTeamAccess } from "@/lib/permissions";
import { getTeamReportStats } from "@/lib/db/reports";
import { ERROR_CODES } from "@/lib/errors";

vi.mock("@/lib/permissions", () => ({
  authorizeTeamAccess: vi.fn(),
}));

vi.mock("@/lib/db/reports", () => ({
  getTeamReportStats: vi.fn(),
}));

const mockAuthorizeTeamAccess = authorizeTeamAccess as vi.MockedFunction<
  typeof authorizeTeamAccess
>;
const mockGetTeamReportStats = getTeamReportStats as vi.MockedFunction<
  typeof getTeamReportStats
>;

describe("reports service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns auth error when team access fails", async () => {
    mockAuthorizeTeamAccess.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden",
    });

    const result = await getTeamReportStatsForUser({
      teamId: 1,
      requestUserId: 7,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(403);
    expect(result.error.errorCode).toBe(ERROR_CODES.FORBIDDEN);
  });

  it("returns mapped report stats on success", async () => {
    mockAuthorizeTeamAccess.mockResolvedValue({
      ok: true,
      team: {} as never,
      user: {} as never,
      teamRole: "admin",
    });
    mockGetTeamReportStats.mockResolvedValue({
      totalItems: 10,
      totalLocations: 2,
      totalTransactions: 5,
      totalStockValue: 123,
      lowStockItems: 1,
      outOfStockItems: 0,
      transactionsByType: { stock_in: 1, stock_out: 2, adjust: 1, move: 1 },
      recentTransactions: [
        {
          id: 1,
          transactionType: "stock_in",
          quantity: 2,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          itemName: "Item A",
        },
      ],
      topItemsByValue: [],
      stockByLocation: [],
      transactionsByDate: [],
    });

    const result = await getTeamReportStatsForUser({
      teamId: 1,
      requestUserId: 7,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.stats.totalItems).toBe(10);
    expect(result.data.stats.recentTransactions[0].createdAt).toBe(
      "2026-01-01T00:00:00.000Z"
    );
  });
});
