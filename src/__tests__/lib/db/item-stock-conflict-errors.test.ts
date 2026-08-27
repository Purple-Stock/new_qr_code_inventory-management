import { describe, expect, it } from "vitest";
import {
  buildItemMaximumStockExceededMessage,
  buildItemStockAtAnotherLocationMessage,
} from "@/lib/db/item-stock-conflict-errors";

describe("item stock conflict messages", () => {
  it("names the location that currently holds the units", () => {
    expect(
      buildItemStockAtAnotherLocationMessage({
        itemName: "XLR Cable",
        claimedDestinationName: "A",
        actualLocationName: "B",
      })
    ).toMatch(/currently at B/);
  });

  it("names the maximum quantity for unique equipment", () => {
    expect(
      buildItemMaximumStockExceededMessage({
        itemName: "SONY ZVE-10 B",
        maximumStock: 1,
        currentStock: 1,
      })
    ).toMatch(/maximum quantity of 1/);
  });

  it("tells the operator how to recover when a numeric cap is exceeded", () => {
    expect(
      buildItemMaximumStockExceededMessage({
        itemName: "XLR Cable",
        maximumStock: 5,
        currentStock: 5,
      })
    ).toBe(
      "Cannot increase XLR Cable beyond the maximum quantity of 5 (current stock: 5). Reduce the stock or raise the maximum quantity on the item."
    );
  });
});
