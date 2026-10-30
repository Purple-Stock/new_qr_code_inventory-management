import { vi } from "vitest";
import { faker } from "@faker-js/faker/locale/pt_BR";
import { createStockTransaction } from "@/lib/db/stock-transactions";
import { clearTestDb, cleanupTestDb, getTestDb } from "../helpers/test-db";
import {
  catalogOf,
  insertCatalogItem,
  seedStockTeam,
  stocksOf,
} from "../helpers/stock-team";

faker.seed(20261030);

const { drizzle } = getTestDb();

vi.doMock("@/db/client", () => ({
  sqlite: drizzle,
}));

describe("Cadeira Azul item_stocks timeline", () => {
  beforeEach(async () => {
    await clearTestDb();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  it("keeps bins honest across in, move, out, adjust, and a unique move", async () => {
    const { user, team, local1, local2 } = await seedStockTeam({
      email: faker.internet.email().toLowerCase(),
    });
    const chair = await insertCatalogItem({
      teamId: team.id,
      name: "Cadeira Azul",
      sku: "CADEIRA-AZUL",
      barcode: faker.string.numeric(13),
      locationId: null,
      currentStock: 0,
      initialQuantity: 0,
    });

    await createStockTransaction({
      itemId: chair.id,
      teamId: team.id,
      transactionType: "stock_in",
      quantity: 20,
      userId: user.id,
      destinationLocationId: local1.id,
    });
    expect(await stocksOf(chair.id)).toEqual([
      { itemId: chair.id, locationId: local1.id, quantity: 20 },
    ]);

    await createStockTransaction({
      itemId: chair.id,
      teamId: team.id,
      transactionType: "move",
      quantity: 8,
      userId: user.id,
      sourceLocationId: local1.id,
      destinationLocationId: local2.id,
    });
    expect(await stocksOf(chair.id)).toEqual([
      { itemId: chair.id, locationId: local1.id, quantity: 12 },
      { itemId: chair.id, locationId: local2.id, quantity: 8 },
    ]);

    await createStockTransaction({
      itemId: chair.id,
      teamId: team.id,
      transactionType: "stock_in",
      quantity: 3,
      userId: user.id,
      destinationLocationId: local2.id,
    });
    expect(await stocksOf(chair.id)).toEqual([
      { itemId: chair.id, locationId: local1.id, quantity: 12 },
      { itemId: chair.id, locationId: local2.id, quantity: 11 },
    ]);

    await createStockTransaction({
      itemId: chair.id,
      teamId: team.id,
      transactionType: "stock_out",
      quantity: 2,
      userId: user.id,
      sourceLocationId: local1.id,
    });
    expect(await stocksOf(chair.id)).toEqual([
      { itemId: chair.id, locationId: local1.id, quantity: 10 },
      { itemId: chair.id, locationId: local2.id, quantity: 11 },
    ]);

    await createStockTransaction({
      itemId: chair.id,
      teamId: team.id,
      transactionType: "adjust",
      quantity: 8,
      userId: user.id,
      destinationLocationId: local2.id,
    });
    expect(await stocksOf(chair.id)).toEqual([
      { itemId: chair.id, locationId: local1.id, quantity: 10 },
      { itemId: chair.id, locationId: local2.id, quantity: 8 },
    ]);

    await createStockTransaction({
      itemId: chair.id,
      teamId: team.id,
      transactionType: "move",
      quantity: 10,
      userId: user.id,
      sourceLocationId: local1.id,
      destinationLocationId: local2.id,
    });
    expect(await stocksOf(chair.id)).toEqual([
      { itemId: chair.id, locationId: local2.id, quantity: 18 },
    ]);

    const catalog = await catalogOf(chair.id);
    expect(catalog.currentStock).toBe(18);
    expect(catalog.locationId).toBe(local2.id);

    await createStockTransaction({
      itemId: chair.id,
      teamId: team.id,
      transactionType: "stock_out",
      quantity: 18,
      userId: user.id,
      sourceLocationId: local2.id,
    });
    expect(await stocksOf(chair.id)).toEqual([]);
    expect((await catalogOf(chair.id)).currentStock).toBe(0);

    const camera = await insertCatalogItem({
      teamId: team.id,
      name: "Sony FX3",
      barcode: faker.string.numeric(13),
      locationId: local1.id,
      currentStock: 1,
      initialQuantity: 1,
      maximumStock: 1,
    });
    await createStockTransaction({
      itemId: camera.id,
      teamId: team.id,
      transactionType: "move",
      quantity: 1,
      userId: user.id,
      sourceLocationId: local1.id,
      destinationLocationId: local2.id,
    });
    expect(await stocksOf(camera.id)).toEqual([
      { itemId: camera.id, locationId: local2.id, quantity: 1 },
    ]);

    await expect(
      createStockTransaction({
        itemId: camera.id,
        teamId: team.id,
        transactionType: "stock_in",
        quantity: 1,
        userId: user.id,
        destinationLocationId: local1.id,
      })
    ).rejects.toThrow(/maximum quantity of 1/i);
    expect(await stocksOf(camera.id)).toEqual([
      { itemId: camera.id, locationId: local2.id, quantity: 1 },
    ]);
  });
});
