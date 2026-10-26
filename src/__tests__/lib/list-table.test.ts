import { nextSort, paginateList, sortBy } from "@/lib/list-table";

const rows = [
  { id: 1, name: "Zebra", qty: 2, when: "2026-01-03T00:00:00.000Z" },
  { id: 2, name: "alpha", qty: 10, when: "2026-01-01T00:00:00.000Z" },
  { id: 3, name: "Mike", qty: null, when: "2026-01-02T00:00:00.000Z" },
];

const getters = {
  name: (row: (typeof rows)[number]) => row.name,
  qty: (row: (typeof rows)[number]) => row.qty,
  when: (row: (typeof rows)[number]) => row.when,
};

describe("paginateList", () => {
  it("slices 10 items per page", () => {
    const items = Array.from({ length: 25 }, (_, index) => ({ id: index + 1 }));

    const result = paginateList(items, 2);

    expect(result.items.map((item) => item.id)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(result.currentPage).toBe(2);
    expect(result.totalPages).toBe(3);
  });
});

describe("sortBy", () => {
  it("keeps the original order when sort is null", () => {
    expect(sortBy(rows, null, getters).map((row) => row.id)).toEqual([1, 2, 3]);
  });

  it("sorts text without regard to case and keeps nulls last", () => {
    expect(sortBy(rows, { key: "name", direction: "asc" }, getters).map((row) => row.name)).toEqual([
      "alpha",
      "Mike",
      "Zebra",
    ]);
  });

  it("sorts numbers and keeps nulls last on both directions", () => {
    expect(sortBy(rows, { key: "qty", direction: "asc" }, getters).map((row) => row.qty)).toEqual([
      2, 10, null,
    ]);
    expect(sortBy(rows, { key: "qty", direction: "desc" }, getters).map((row) => row.qty)).toEqual([
      10, 2, null,
    ]);
  });

  it("sorts ISO dates", () => {
    expect(sortBy(rows, { key: "when", direction: "asc" }, getters).map((row) => row.id)).toEqual([
      2, 3, 1,
    ]);
  });
});

describe("nextSort", () => {
  it("starts ascending then toggles descending", () => {
    const first = nextSort(null, "name");
    const second = nextSort(first, "name");

    expect(first).toEqual({ key: "name", direction: "asc" });
    expect(second).toEqual({ key: "name", direction: "desc" });
  });
});
