import { describe, expect, it } from "vitest";
import {
  formatMaximumStockInput,
  parseMaximumStockInput,
} from "@/lib/item-maximum-stock";

describe("parseMaximumStockInput", () => {
  it("treats a blank field as unlimited stock", () => {
    expect(parseMaximumStockInput("")).toEqual({ ok: true, value: null });
    expect(parseMaximumStockInput("   ")).toEqual({ ok: true, value: null });
  });

  it("parses a numeric maximum greater than one", () => {
    expect(parseMaximumStockInput("5")).toEqual({ ok: true, value: 5 });
    expect(parseMaximumStockInput("1")).toEqual({ ok: true, value: 1 });
  });

  it("rejects negative and non-numeric values", () => {
    expect(parseMaximumStockInput("-1").ok).toBe(false);
    expect(parseMaximumStockInput("abc").ok).toBe(false);
  });
});

describe("formatMaximumStockInput", () => {
  it("keeps a numeric cap editable and leaves unlimited blank", () => {
    expect(formatMaximumStockInput(5)).toBe("5");
    expect(formatMaximumStockInput(1)).toBe("1");
    expect(formatMaximumStockInput(null)).toBe("");
    expect(formatMaximumStockInput(undefined)).toBe("");
  });
});
