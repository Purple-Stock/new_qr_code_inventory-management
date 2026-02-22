import { vi } from "vitest";
import {
  formatLocation,
  formatQuantity,
  getTransactionTypeColor,
  getTransactionTypeLabel,
} from "@/app/teams/[id]/transactions/_utils/getTransactionType";
import { formatDate } from "@/app/teams/[id]/transactions/_utils/formatDate";

describe("transactions UI utils", () => {
  const t = {
    transactions: {
      stockIn: "Stock In",
      stockOut: "Stock Out",
      adjust: "Adjust",
      move: "Move",
      count: "Count",
      defaultLocation: "Default",
    },
  };

  describe("getTransactionTypeLabel", () => {
    it("returns translated labels for known transaction types", () => {
      expect(getTransactionTypeLabel("stock_in", t)).toBe("Stock In");
      expect(getTransactionTypeLabel("stock_out", t)).toBe("Stock Out");
      expect(getTransactionTypeLabel("adjust", t)).toBe("Adjust");
      expect(getTransactionTypeLabel("move", t)).toBe("Move");
      expect(getTransactionTypeLabel("count", t)).toBe("Count");
    });

    it("falls back to original type for unknown values", () => {
      expect(getTransactionTypeLabel("custom_type", t)).toBe("custom_type");
    });
  });

  describe("getTransactionTypeColor", () => {
    it("returns style classes for known transaction types", () => {
      expect(getTransactionTypeColor("stock_in")).toContain("green");
      expect(getTransactionTypeColor("stock_out")).toContain("red");
      expect(getTransactionTypeColor("adjust")).toContain("yellow");
      expect(getTransactionTypeColor("move")).toContain("blue");
    });

    it("uses gray fallback class for unknown types", () => {
      expect(getTransactionTypeColor("custom_type")).toContain("gray");
    });
  });

  describe("formatQuantity", () => {
    it("uses negative sign for stock_out", () => {
      expect(formatQuantity(4, "stock_out")).toBe("-4.0");
    });

    it("uses positive sign for non stock_out types", () => {
      expect(formatQuantity(4, "stock_in")).toBe("+4.0");
      expect(formatQuantity(4, "adjust")).toBe("+4.0");
    });
  });

  describe("formatLocation", () => {
    it("formats move locations as source to destination", () => {
      const result = formatLocation(
        {
          transactionType: "move",
          sourceLocation: { name: "A1" },
          destinationLocation: { name: "B2" },
        },
        t
      );

      expect(result).toBe("A1 → B2");
    });

    it("uses default location when move endpoints are missing", () => {
      const result = formatLocation(
        {
          transactionType: "move",
          sourceLocation: null,
          destinationLocation: null,
        },
        t
      );

      expect(result).toBe("Default → Default");
    });

    it("prefers destination then source for non-move transactions", () => {
      expect(
        formatLocation(
          {
            transactionType: "stock_in",
            destinationLocation: { name: "Shelf 1" },
            sourceLocation: { name: "Backroom" },
          },
          t
        )
      ).toBe("Shelf 1");

      expect(
        formatLocation(
          {
            transactionType: "stock_out",
            destinationLocation: null,
            sourceLocation: { name: "Backroom" },
          },
          t
        )
      ).toBe("Backroom");

      expect(
        formatLocation(
          {
            transactionType: "adjust",
            destinationLocation: null,
            sourceLocation: null,
          },
          t
        )
      ).toBe("Default");
    });
  });

  describe("formatDate", () => {
    it("formats date with locale mapping", () => {
      const date = "2026-02-07T15:30:00.000Z";

      const en = formatDate(date, "en");
      const fr = formatDate(date, "fr");
      const pt = formatDate(date, "pt-BR");

      expect(en).toMatch(/2026|26/);
      expect(fr).toMatch(/2026|26/);
      expect(pt).toMatch(/2026|26/);
    });
  });
});
