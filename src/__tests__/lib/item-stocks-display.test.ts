import { faker } from "@faker-js/faker/locale/pt_BR";
import {
  itemsWithLocationBalancesFromStocks,
  uniqueCatalogItems,
} from "@/lib/item-stocks-display";

faker.seed(20261030);

const LOCAL_1 = 1;
const LOCAL_2 = 3;

describe("itemsWithLocationBalancesFromStocks", () => {
  it("splits Cadeira Azul from item_stocks bins", () => {
    const rows = itemsWithLocationBalancesFromStocks(
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
          locationName: "Local2",
        },
      ],
      [
        { itemId: 1, locationId: LOCAL_1, quantity: 12 },
        { itemId: 1, locationId: LOCAL_2, quantity: 8 },
      ],
      [
        { id: LOCAL_1, name: "Local 1" },
        { id: LOCAL_2, name: "Local2" },
      ]
    );

    expect(rows).toEqual(
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
    expect(rows).toHaveLength(2);
  });

  it("falls back to the catalog slot when the item has no stock rows", () => {
    const itemId = faker.number.int({ min: 70, max: 90 });
    const rows = itemsWithLocationBalancesFromStocks(
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
          locationName: "Graúna",
        },
      ],
      [],
      [{ id: LOCAL_1, name: "Graúna" }]
    );

    expect(rows).toEqual([
      expect.objectContaining({
        id: itemId,
        locationId: LOCAL_1,
        currentStock: 1,
      }),
    ]);
  });
});

describe("uniqueCatalogItems", () => {
  it("collapses split bins into one SKU with summed stock", () => {
    const rows = uniqueCatalogItems([
      {
        id: 1,
        name: "Cadeira Azul",
        currentStock: 12,
        locationId: LOCAL_1,
      },
      {
        id: 1,
        name: "Cadeira Azul",
        currentStock: 8,
        locationId: LOCAL_2,
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(1);
    expect(rows[0].currentStock).toBe(20);
  });
});
