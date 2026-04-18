// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  readLocalStorageJson,
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
