import { vi } from "vitest";
import { stockTransactions } from "@/db/schema";
import { backfillItemStocksIfEmpty } from "@/lib/db/item-stocks";
import { clearTestDb, cleanupTestDb, getTestDb } from "../helpers/test-db";
import {
  catalogOf,
  insertCatalogItem,
  seedStockTeam,
  stocksOf,
} from "../helpers/stock-team";

const { drizzle } = getTestDb();

vi.doMock("@/db/client", () => ({
  sqlite: drizzle,
}));

describe("backfillItemStocksIfEmpty", () => {
  beforeEach(async () => {
    await clearTestDb();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  it("replays Galpão Cadeira Azul as 12/8 and leaves the catalog tag on Local2", async () => {
    const { drizzle } = getTestDb();
    const { user, team, local1, local2 } = await seedStockTeam({
      email: "backfill-cadeira@example.com",
    });
    const chair = await insertCatalogItem({
      teamId: team.id,
      name: "Cadeira Azul",
      sku: "CADEIRA-AZUL",
      barcode: "5817915565817",
      locationId: local2.id,
      currentStock: 20,
      initialQuantity: 0,
    });
    await drizzle.insert(stockTransactions).values([
      {
        itemId: chair.id,
        teamId: team.id,
        transactionType: "stock_in",
        quantity: 20,
        userId: user.id,
        destinationLocationId: local1.id,
      },
      {
        itemId: chair.id,
        teamId: team.id,
        transactionType: "move",
        quantity: 8,
        userId: user.id,
        sourceLocationId: local1.id,
        destinationLocationId: local2.id,
      },
    ]);

    const inserted = await backfillItemStocksIfEmpty();
    expect(inserted).toBe(2);
    expect(await stocksOf(chair.id)).toEqual([
      { itemId: chair.id, locationId: local1.id, quantity: 12 },
      { itemId: chair.id, locationId: local2.id, quantity: 8 },
    ]);

    const catalog = await catalogOf(chair.id);
    expect(catalog.locationId).toBe(local2.id);
    expect(catalog.currentStock).toBe(20);

    expect(await backfillItemStocksIfEmpty()).toBe(0);
    expect(await stocksOf(chair.id)).toHaveLength(2);
  });

  it("keeps items.current_stock and items.location_id columns", async () => {
    const { db } = getTestDb();
    const info = await db.execute("PRAGMA table_info(items)");
    const names = info.rows.map((row) => String(row.name));
    expect(names).toEqual(
      expect.arrayContaining(["current_stock", "location_id"])
    );
  });
});
