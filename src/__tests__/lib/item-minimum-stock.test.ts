import { describe, expect, it } from "vitest";
import {
  crossedMinimumStockThreshold,
  formatMinimumStockInput,
  getItemStockBadgeTone,
  parseMinimumStockInput,
} from "@/lib/item-minimum-stock";

describe("parseMinimumStockInput", () => {
  it("treats a blank field as unarmed minimum of zero", () => {
    expect(parseMinimumStockInput("")).toEqual({ ok: true, value: 0 });
    expect(parseMinimumStockInput("   ")).toEqual({ ok: true, value: 0 });
  });

  it("parses a numeric minimum including zero", () => {
    expect(parseMinimumStockInput("0")).toEqual({ ok: true, value: 0 });
    expect(parseMinimumStockInput("2")).toEqual({ ok: true, value: 2 });
  });

  it("rejects negative and non-numeric values", () => {
    expect(parseMinimumStockInput("-1").ok).toBe(false);
    expect(parseMinimumStockInput("abc").ok).toBe(false);
  });
});

describe("formatMinimumStockInput", () => {
  it("keeps a positive minimum editable and leaves zero blank", () => {
    expect(formatMinimumStockInput(2)).toBe("2");
    expect(formatMinimumStockInput(0)).toBe("");
    expect(formatMinimumStockInput(null)).toBe("");
    expect(formatMinimumStockInput(undefined)).toBe("");
  });
});

describe("crossedMinimumStockThreshold", () => {
  it("does not fire when the minimum is unarmed", () => {
    expect(
      crossedMinimumStockThreshold({
        previousStock: 5,
        nextStock: 1,
        minimumStock: 0,
      })
    ).toBe(false);
  });

  it("fires when stock crosses from above the minimum to at or below it", () => {
    expect(
      crossedMinimumStockThreshold({
        previousStock: 5,
        nextStock: 2,
        minimumStock: 2,
      })
    ).toBe(true);
    expect(
      crossedMinimumStockThreshold({
        previousStock: 5,
        nextStock: 0,
        minimumStock: 2,
      })
    ).toBe(true);
  });

  it("does not fire on later outs after stock is already at or below the minimum", () => {
    expect(
      crossedMinimumStockThreshold({
        previousStock: 2,
        nextStock: 1,
        minimumStock: 2,
      })
    ).toBe(false);
    expect(
      crossedMinimumStockThreshold({
        previousStock: 1,
        nextStock: 0,
        minimumStock: 2,
      })
    ).toBe(false);
  });
});

describe("getItemStockBadgeTone", () => {
  it("marks zero stock as out regardless of the minimum", () => {
    expect(
      getItemStockBadgeTone({ currentStock: 0, minimumStock: 2 })
    ).toBe("out");
  });

  it("marks remaining units at or below an armed minimum as low", () => {
    expect(
      getItemStockBadgeTone({ currentStock: 2, minimumStock: 2 })
    ).toBe("low");
    expect(
      getItemStockBadgeTone({ currentStock: 1, minimumStock: 2 })
    ).toBe("low");
  });

  it("stays ok when the minimum is unarmed even if stock is under ten", () => {
    expect(
      getItemStockBadgeTone({ currentStock: 5, minimumStock: 0 })
    ).toBe("ok");
  });
});
