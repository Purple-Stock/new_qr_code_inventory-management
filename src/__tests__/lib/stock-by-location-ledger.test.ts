import { faker } from "@faker-js/faker";
import {
  itemsWithLocationBalancesFromLedger,
  reportStockByLocationFromLedger,
} from "@/lib/stock-by-location-ledger";

faker.seed(20261030);

const LOCAL_1 = 1;
const LOCAL_2 = 3;

function makeItem(
  overrides: Partial<Parameters<typeof itemsWithLocationBalancesFromLedger>[0][number]> = {}
) {
  return {
    id: faker.number.int({ min: 1, max: 99 }),
    name: faker.commerce.productName(),
    sku: faker.string.alphanumeric({ length: 8 }).toUpperCase(),
    barcode: faker.string.numeric(13),
    price: null,
    currentStock: 0,
    initialQuantity: 0,
    locationId: LOCAL_1,
    locationName: "Local 1",
    ...overrides,
  };
}

describe("itemsWithLocationBalancesFromLedger", () => {
  it("splits Galpão Cadeira Azul by the transaction book instead of item.locationId", () => {
    const chair = makeItem({
      id: 1,
      name: "Cadeira Azul",
      sku: "CADEIRA-AZUL",
      barcode: "5817915565817",
      currentStock: 20,
      locationId: LOCAL_2,
      locationName: "Local2",
    });
    const printer = makeItem({
      id: 12,
      name: "impressora",
      sku: "IMPRESSORA",
      barcode: "4066956127856",
      currentStock: 10,
      locationId: LOCAL_1,
      locationName: "Local 1",
    });

    const rows = itemsWithLocationBalancesFromLedger(
      [chair, printer],
      [
        { id: 20, itemId: 1, transactionType: "stock_in", quantity: 3, sourceLocationId: null, destinationLocationId: LOCAL_1, createdAt: "2026-02-11T20:47:45Z" },
        { id: 21, itemId: 1, transactionType: "stock_in", quantity: 1, sourceLocationId: null, destinationLocationId: LOCAL_1, createdAt: "2026-02-19T12:39:09Z" },
        { id: 22, itemId: 1, transactionType: "stock_in", quantity: 5, sourceLocationId: null, destinationLocationId: LOCAL_1, createdAt: "2026-03-31T18:40:43Z" },
        { id: 23, itemId: 1, transactionType: "stock_in", quantity: 3, sourceLocationId: null, destinationLocationId: LOCAL_1, createdAt: "2026-02-24T00:51:03Z" },
        { id: 40, itemId: 1, transactionType: "stock_in", quantity: 1, sourceLocationId: null, destinationLocationId: LOCAL_1, createdAt: "2026-03-31T18:40:43Z" },
        { id: 483, itemId: 1, transactionType: "move", quantity: 2, sourceLocationId: LOCAL_1, destinationLocationId: LOCAL_2, createdAt: "2026-07-15T16:53:42Z" },
        { id: 487, itemId: 1, transactionType: "move", quantity: 1, sourceLocationId: LOCAL_1, destinationLocationId: LOCAL_2, createdAt: "2026-08-17T18:35:38Z" },
        { id: 542, itemId: 1, transactionType: "stock_in", quantity: 1, sourceLocationId: null, destinationLocationId: LOCAL_1, createdAt: "2026-08-24T14:07:58Z" },
        { id: 717, itemId: 1, transactionType: "stock_in", quantity: 6, sourceLocationId: null, destinationLocationId: LOCAL_1, createdAt: "2026-10-23T17:04:42Z" },
        { id: 718, itemId: 1, transactionType: "move", quantity: 5, sourceLocationId: LOCAL_1, destinationLocationId: LOCAL_2, createdAt: "2026-10-23T17:09:27Z" },
        { id: 788, itemId: 12, transactionType: "stock_in", quantity: 10, sourceLocationId: null, destinationLocationId: LOCAL_1, createdAt: "2026-10-30T19:51:58Z" },
      ],
      [
        { id: LOCAL_1, name: "Local 1" },
        { id: LOCAL_2, name: "Local2" },
      ]
    );

    const chairRows = rows.filter((row) => row.id === 1);
    expect(chairRows).toHaveLength(2);
    expect(chairRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1,
          locationId: LOCAL_1,
          locationName: "Local 1",
          currentStock: 12,
        }),
        expect.objectContaining({
          id: 1,
          locationId: LOCAL_2,
          locationName: "Local2",
          currentStock: 8,
        }),
      ])
    );
    expect(rows.filter((row) => row.id === 12)).toEqual([
      expect.objectContaining({
        id: 12,
        locationId: LOCAL_1,
        currentStock: 10,
      }),
    ]);
  });

  it("keeps an item with no transactions on its stored location", () => {
    const item = makeItem({ currentStock: 4, locationId: LOCAL_2, locationName: "Local2" });

    const rows = itemsWithLocationBalancesFromLedger(
      [item],
      [],
      [
        { id: LOCAL_1, name: "Local 1" },
        { id: LOCAL_2, name: "Local2" },
      ]
    );

    expect(rows).toEqual([
      expect.objectContaining({
        id: item.id,
        locationId: LOCAL_2,
        locationName: "Local2",
        currentStock: 4,
      }),
    ]);
  });

  it("subtracts stock_out from the source location in the book", () => {
    const item = makeItem({ id: 7, currentStock: 5, locationId: LOCAL_2 });

    const rows = itemsWithLocationBalancesFromLedger(
      [item],
      [
        { id: 1, itemId: 7, transactionType: "stock_in", quantity: 10, sourceLocationId: null, destinationLocationId: LOCAL_1, createdAt: "2026-01-01T00:00:00Z" },
        { id: 2, itemId: 7, transactionType: "stock_out", quantity: 3, sourceLocationId: LOCAL_1, destinationLocationId: null, createdAt: "2026-01-02T00:00:00Z" },
        { id: 3, itemId: 7, transactionType: "move", quantity: 2, sourceLocationId: LOCAL_1, destinationLocationId: LOCAL_2, createdAt: "2026-01-03T00:00:00Z" },
      ],
      [
        { id: LOCAL_1, name: "Local 1" },
        { id: LOCAL_2, name: "Local2" },
      ]
    );

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 7, locationId: LOCAL_1, currentStock: 5 }),
        expect.objectContaining({ id: 7, locationId: LOCAL_2, currentStock: 2 }),
      ])
    );
  });
});

describe("reportStockByLocationFromLedger", () => {
  it("aggregates Galpão split stock without stuffing English No Location", () => {
    const chair = makeItem({
      id: 1,
      name: "Cadeira Azul",
      currentStock: 20,
      price: 10,
      locationId: LOCAL_2,
      locationName: "Local2",
    });
    const printer = makeItem({
      id: 12,
      name: "impressora",
      currentStock: 10,
      price: 5,
      locationId: LOCAL_1,
      locationName: "Local 1",
    });

    const rows = reportStockByLocationFromLedger(
      [chair, printer],
      [
        { id: 1, itemId: 1, transactionType: "stock_in", quantity: 20, sourceLocationId: null, destinationLocationId: LOCAL_1, createdAt: "2026-01-01T00:00:00Z" },
        { id: 2, itemId: 1, transactionType: "move", quantity: 8, sourceLocationId: LOCAL_1, destinationLocationId: LOCAL_2, createdAt: "2026-01-02T00:00:00Z" },
        { id: 3, itemId: 12, transactionType: "stock_in", quantity: 10, sourceLocationId: null, destinationLocationId: LOCAL_1, createdAt: "2026-10-30T19:51:58Z" },
      ],
      [
        { id: LOCAL_1, name: "Local 1" },
        { id: LOCAL_2, name: "Local2" },
      ]
    );

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          locationId: LOCAL_1,
          locationName: "Local 1",
          itemCount: 2,
          totalStock: 22,
        }),
        expect.objectContaining({
          locationId: LOCAL_2,
          locationName: "Local2",
          itemCount: 1,
          totalStock: 8,
        }),
      ])
    );
    expect(rows.every((row) => row.locationName !== "No Location")).toBe(true);
  });
});

