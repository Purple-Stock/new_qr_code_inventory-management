// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  readLocalStorageJson,
  reconcileDraftItems,
  removeLocalStorageEntry,
  writeLocalStorageJson,
} from "@/lib/local-storage";

describe("local-storage helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null instead of throwing when localStorage access is blocked", () => {
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: () => {
          throw new DOMException("Blocked", "SecurityError");
        },
        removeItem: vi.fn(),
      },
      configurable: true,
    });

    expect(readLocalStorageJson("inventory-draft:stock-in:1")).toBeNull();
  });

  it("swallows write and remove failures from localStorage", () => {
    Object.defineProperty(window, "localStorage", {
      value: {
        setItem: () => {
          throw new DOMException("Quota exceeded", "QuotaExceededError");
        },
        removeItem: () => {
          throw new DOMException("Blocked", "SecurityError");
        },
      },
      configurable: true,
    });

    expect(() => writeLocalStorageJson("inventory-draft:stock-in:1", { notes: "draft" })).not.toThrow();
    expect(() => removeLocalStorageEntry("inventory-draft:stock-in:1")).not.toThrow();
  });
});

describe("reconcileDraftItems", () => {
  const currentItems = [
    { id: 1, name: "Printer", sku: "PR-1", currentStock: 5 },
    { id: 2, name: "Scanner", sku: "SC-1", currentStock: 10 },
  ];

  it("returns empty array for undefined or empty input", () => {
    expect(reconcileDraftItems(undefined, currentItems)).toEqual([]);
    expect(reconcileDraftItems([], currentItems)).toEqual([]);
  });

  it("replaces stale item data with fresh current item while preserving extra fields", () => {
    const draftItems = [{ item: { id: 1, name: "Old name", sku: "OLD", currentStock: 99 }, quantity: 3 }];
    const result = reconcileDraftItems(draftItems, currentItems);
    expect(result).toEqual([{ item: currentItems[0], quantity: 3 }]);
  });

  it("drops items that no longer exist in the current catalog", () => {
    const draftItems = [
      { item: { id: 999, name: "Ghost", sku: "GH-1", currentStock: 5 }, quantity: 2 },
      { item: { id: 2, name: "Scanner", sku: "SC-1", currentStock: 10 }, quantity: 1 },
    ];
    const result = reconcileDraftItems(draftItems, currentItems);
    expect(result).toHaveLength(1);
    expect(result[0].item.id).toBe(2);
  });

  it("preserves non-quantity extra fields (e.g. newStock for adjust)", () => {
    const draftItems = [{ item: { id: 1, name: "Printer", sku: "PR-1", currentStock: 5 }, newStock: 7 }];
    const result = reconcileDraftItems(draftItems, currentItems);
    expect(result).toEqual([{ item: currentItems[0], newStock: 7 }]);
  });
});
