import { paginateTransactions } from "@/app/teams/[id]/transactions/_utils/pagination";

const buildTransactions = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: index + 1 }));

describe("transactions pagination utils", () => {
  it("returns 10 items on the first page when there are more than 10 transactions", () => {
    const transactions = buildTransactions(25);

    const result = paginateTransactions(transactions, "1");

    expect(result.items).toHaveLength(10);
    expect(result.currentPage).toBe(1);
    expect(result.totalPages).toBe(3);
    expect(result.items[0]?.id).toBe(1);
    expect(result.items[9]?.id).toBe(10);
  });

  it("returns the correct slice for middle pages", () => {
    const transactions = buildTransactions(25);

    const result = paginateTransactions(transactions, "2");

    expect(result.items).toHaveLength(10);
    expect(result.currentPage).toBe(2);
    expect(result.totalPages).toBe(3);
    expect(result.items[0]?.id).toBe(11);
    expect(result.items[9]?.id).toBe(20);
  });

  it("clamps page numbers smaller than 1", () => {
    const transactions = buildTransactions(25);

    const result = paginateTransactions(transactions, "0");

    expect(result.currentPage).toBe(1);
    expect(result.items[0]?.id).toBe(1);
  });

  it("clamps page numbers larger than total pages", () => {
    const transactions = buildTransactions(25);

    const result = paginateTransactions(transactions, "999");

    expect(result.currentPage).toBe(3);
    expect(result.items).toHaveLength(5);
    expect(result.items[0]?.id).toBe(21);
  });

  it("falls back to page 1 for invalid page values", () => {
    const transactions = buildTransactions(12);

    const result = paginateTransactions(transactions, "abc");

    expect(result.currentPage).toBe(1);
    expect(result.totalPages).toBe(2);
    expect(result.items).toHaveLength(10);
  });

  it("keeps totalPages as 1 when there are no transactions", () => {
    const result = paginateTransactions([], "5");

    expect(result.currentPage).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.items).toHaveLength(0);
  });
});
