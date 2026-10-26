import { sortItems } from "@/app/teams/[id]/items/_utils/sortItems";

const items = [
  { id: 1, name: "Zebra", sku: "B", itemType: "Cabo", currentStock: 2, price: 30 },
  { id: 2, name: "alpha", sku: "C", itemType: "Áudio", currentStock: 10, price: null },
  { id: 3, name: "Mike", sku: null, itemType: "Bateria", currentStock: 1, price: 5 },
];

describe("sortItems", () => {
  it("keeps the original order when sort is null", () => {
    expect(sortItems(items, null).map((item) => item.id)).toEqual([1, 2, 3]);
  });

  it("does not mutate the input array", () => {
    sortItems(items, { key: "name", direction: "asc" });

    expect(items.map((item) => item.id)).toEqual([1, 2, 3]);
  });

  it("sorts names ascending without regard to case", () => {
    expect(sortItems(items, { key: "name", direction: "asc" }).map((item) => item.name)).toEqual([
      "alpha",
      "Mike",
      "Zebra",
    ]);
  });

  it("sorts names descending", () => {
    expect(sortItems(items, { key: "name", direction: "desc" }).map((item) => item.name)).toEqual([
      "Zebra",
      "Mike",
      "alpha",
    ]);
  });

  it("sorts stock as numbers", () => {
    expect(
      sortItems(items, { key: "currentStock", direction: "asc" }).map((item) => item.currentStock)
    ).toEqual([1, 2, 10]);
  });

  it("places null prices last on both directions", () => {
    expect(sortItems(items, { key: "price", direction: "asc" }).map((item) => item.price)).toEqual([
      5, 30, null,
    ]);
    expect(sortItems(items, { key: "price", direction: "desc" }).map((item) => item.price)).toEqual([
      30, 5, null,
    ]);
  });

  it("places empty sku last", () => {
    expect(sortItems(items, { key: "sku", direction: "asc" }).map((item) => item.sku)).toEqual([
      "B",
      "C",
      null,
    ]);
  });
});
