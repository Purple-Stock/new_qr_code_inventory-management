import { vi } from "vitest";
import { createStockTransaction } from "@/lib/db/stock-transactions";
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

describe("item_stocks write path", () => {
  beforeEach(async () => {
    await clearTestDb();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  it("adds stock_in at a second location without teleporting the first bin", async () => {
    const { user, team, local1, local2 } = await seedStockTeam({
      email: "entrada-dois-locais@example.com",
    });
    const chair = await insertCatalogItem({
      teamId: team.id,
      name: "Cadeira Azul",
      sku: "CADEIRA-AZUL",
      barcode: "cadeira-entrada-split",
      locationId: local2.id,
      currentStock: 8,
      initialQuantity: 8,
    });

    await createStockTransaction({
      itemId: chair.id,
      teamId: team.id,
      transactionType: "stock_in",
      quantity: 3,
      userId: user.id,
      destinationLocationId: local1.id,
    });

    expect(await stocksOf(chair.id)).toEqual([
      { itemId: chair.id, locationId: local1.id, quantity: 3 },
      { itemId: chair.id, locationId: local2.id, quantity: 8 },
    ]);
    const catalog = await catalogOf(chair.id);
    expect(catalog.currentStock).toBe(11);
    expect(catalog.locationId).toBe(local2.id);
  });

  it("splits item_stocks on a partial move and keeps leftover at source", async () => {
    const { user, team, local1, local2 } = await seedStockTeam({
      email: "mover-parcial@example.com",
    });
    const chair = await insertCatalogItem({
      teamId: team.id,
      name: "Cadeira Azul",
      barcode: "cadeira-move-split",
      locationId: local1.id,
      currentStock: 20,
      initialQuantity: 20,
    });

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
    const catalog = await catalogOf(chair.id);
    expect(catalog.currentStock).toBe(20);
    expect(catalog.locationId).toBe(local1.id);
  });

  it("subtracts stock_out only from the source location", async () => {
    const { user, team, local1, local2 } = await seedStockTeam({
      email: "saida-fonte@example.com",
    });
    const chair = await insertCatalogItem({
      teamId: team.id,
      name: "Cadeira Azul",
      barcode: "cadeira-saida-fonte",
      locationId: local2.id,
      currentStock: 20,
      initialQuantity: 20,
    });
    await createStockTransaction({
      itemId: chair.id,
      teamId: team.id,
      transactionType: "move",
      quantity: 8,
      userId: user.id,
      sourceLocationId: local2.id,
      destinationLocationId: local1.id,
    });

    await createStockTransaction({
      itemId: chair.id,
      teamId: team.id,
      transactionType: "stock_out",
      quantity: 2,
      userId: user.id,
      sourceLocationId: local1.id,
    });

    expect(await stocksOf(chair.id)).toEqual([
      { itemId: chair.id, locationId: local1.id, quantity: 6 },
      { itemId: chair.id, locationId: local2.id, quantity: 12 },
    ]);
  });

  it("sets adjust quantity at the destination without wiping the other bin", async () => {
    const { user, team, local1, local2 } = await seedStockTeam({
      email: "ajuste-destino@example.com",
    });
    const chair = await insertCatalogItem({
      teamId: team.id,
      name: "Cadeira Azul",
      barcode: "cadeira-ajuste",
      locationId: local1.id,
      currentStock: 20,
      initialQuantity: 20,
    });
    await createStockTransaction({
      itemId: chair.id,
      teamId: team.id,
      transactionType: "move",
      quantity: 8,
      userId: user.id,
      sourceLocationId: local1.id,
      destinationLocationId: local2.id,
    });

    await createStockTransaction({
      itemId: chair.id,
      teamId: team.id,
      transactionType: "adjust",
      quantity: 10,
      userId: user.id,
      destinationLocationId: local2.id,
    });

    expect(await stocksOf(chair.id)).toEqual([
      { itemId: chair.id, locationId: local1.id, quantity: 12 },
      { itemId: chair.id, locationId: local2.id, quantity: 10 },
    ]);
    const catalog = await catalogOf(chair.id);
    expect(catalog.currentStock).toBe(22);
  });

  it("relocates a Graúna unique qty-1 row on a full move", async () => {
    const { user, team, local1, local2 } = await seedStockTeam({
      email: "grauna-qty1@example.com",
      teamName: "Audiovisual",
    });
    const camera = await insertCatalogItem({
      teamId: team.id,
      name: "Sony FX3",
      barcode: "fx3-unica",
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
    const catalog = await catalogOf(camera.id);
    expect(catalog.currentStock).toBe(1);
    expect(catalog.locationId).toBe(local2.id);
  });
});
