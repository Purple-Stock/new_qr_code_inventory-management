import { faker } from "@faker-js/faker/locale/pt_BR";
import { itemStockRowsFromCatalogAndLedger } from "@/lib/item-stocks-backfill";
import { itemStockRowsFromCatalogAndLedger as itemStockRowsFromMjs } from "../../../scripts/item-stocks-backfill-core.mjs";

faker.seed(20261030);

const LOCAL_1 = 1;
const LOCAL_2 = 3;

describe("itemStockRowsFromCatalogAndLedger", () => {
  it("backfills Galpão Cadeira Azul as 12 at Local 1 and 8 at Local2", () => {
    const rows = itemStockRowsFromCatalogAndLedger(
      [
        {
          id: 1,
          name: "Cadeira Azul",
          sku: "CADEIRA-AZUL",
          barcode: "5817915565817",
          price: null,
          currentStock: 20,
          initialQuantity: 0,
          locationId: LOCAL_2,
        },
      ],
      [
        {
          id: 1,
          itemId: 1,
          transactionType: "stock_in",
          quantity: 20,
          sourceLocationId: null,
          destinationLocationId: LOCAL_1,
          createdAt: "2026-01-01T00:00:00Z",
        },
        {
          id: 2,
          itemId: 1,
          transactionType: "move",
          quantity: 8,
          sourceLocationId: LOCAL_1,
          destinationLocationId: LOCAL_2,
          createdAt: "2026-01-02T00:00:00Z",
        },
      ],
      [
        { id: LOCAL_1, name: "Local 1" },
        { id: LOCAL_2, name: "Local2" },
      ]
    );

    expect(rows).toEqual(
      expect.arrayContaining([
        { itemId: 1, locationId: LOCAL_1, quantity: 12 },
        { itemId: 1, locationId: LOCAL_2, quantity: 8 },
      ])
    );
    expect(rows).toHaveLength(2);
    expect(rows.reduce((sum, row) => sum + row.quantity, 0)).toBe(20);
  });

  it("keeps a Graúna unique item as qty 1 on its stored location when there are no txs", () => {
    const itemId = faker.number.int({ min: 70, max: 90 });
    const rows = itemStockRowsFromCatalogAndLedger(
      [
        {
          id: itemId,
          name: "Sony FX3",
          sku: "FX3-1",
          barcode: faker.string.numeric(13),
          price: null,
          currentStock: 1,
          initialQuantity: 1,
          locationId: LOCAL_1,
        },
      ],
      [],
      [
        { id: LOCAL_1, name: "Graúna" },
        { id: LOCAL_2, name: "Set" },
      ]
    );

    expect(rows).toEqual([{ itemId, locationId: LOCAL_1, quantity: 1 }]);
  });

  it("skips zero quantity and items with no location", () => {
    const rows = itemStockRowsFromCatalogAndLedger(
      [
        {
          id: 9,
          name: "Cabo morto",
          sku: "XLR-0",
          barcode: "0",
          price: null,
          currentStock: 0,
          initialQuantity: 0,
          locationId: LOCAL_1,
        },
        {
          id: 10,
          name: "Sem endereço",
          sku: "NA",
          barcode: "1",
          price: null,
          currentStock: 4,
          initialQuantity: 0,
          locationId: null,
        },
      ],
      [],
      [{ id: LOCAL_1, name: "Local 1" }]
    );

    expect(rows).toEqual([]);
  });

  it("matches the production JS boot core for Cadeira 12/8 and unix timestamps", () => {
    const items = [
      {
        id: 1,
        name: "Cadeira Azul",
        sku: "CADEIRA-AZUL",
        barcode: "5817915565817",
        price: null,
        currentStock: 20,
        initialQuantity: 0,
        locationId: LOCAL_2,
      },
    ];
    const locations = [
      { id: LOCAL_1, name: "Local 1" },
      { id: LOCAL_2, name: "Local2" },
    ];
    const isoTransactions = [
      {
        id: 1,
        itemId: 1,
        transactionType: "stock_in",
        quantity: 20,
        sourceLocationId: null,
        destinationLocationId: LOCAL_1,
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        id: 2,
        itemId: 1,
        transactionType: "move",
        quantity: 8,
        sourceLocationId: LOCAL_1,
        destinationLocationId: LOCAL_2,
        createdAt: "2026-01-02T00:00:00Z",
      },
    ];
    const unixTransactions = isoTransactions.map((transaction, index) => ({
      ...transaction,
      createdAt: 1767225600 + index * 86400,
    }));

    expect(itemStockRowsFromMjs(items, isoTransactions, locations)).toEqual(
      itemStockRowsFromCatalogAndLedger(items, isoTransactions, locations)
    );
    expect(itemStockRowsFromMjs(items, unixTransactions, locations)).toEqual(
      itemStockRowsFromCatalogAndLedger(items, unixTransactions, locations)
    );
    expect(itemStockRowsFromMjs(items, unixTransactions, locations)).toEqual([
      { itemId: 1, locationId: LOCAL_1, quantity: 12 },
      { itemId: 1, locationId: LOCAL_2, quantity: 8 },
    ]);
  });
});
