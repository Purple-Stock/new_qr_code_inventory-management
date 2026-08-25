import { describe, expect, it } from "vitest";
import {
  formatItemNotAtSourceMessage,
  itemIsAtSourceLocation,
} from "@/app/teams/[id]/move/_utils/itemAtSourceLocation";

describe("itemIsAtSourceLocation", () => {
  it("returns true when the item is at the claimed source location", () => {
    expect(itemIsAtSourceLocation({ locationId: 98 }, 98)).toBe(true);
  });

  it("returns false when the item is at another location", () => {
    expect(itemIsAtSourceLocation({ locationId: 100 }, 98)).toBe(false);
  });

  it("returns false when the item or source location is missing", () => {
    expect(itemIsAtSourceLocation({ locationId: null }, 98)).toBe(false);
    expect(itemIsAtSourceLocation({ locationId: 100 }, null)).toBe(false);
  });
});

describe("formatItemNotAtSourceMessage", () => {
  it("fills item, source and actual location names", () => {
    const message = formatItemNotAtSourceMessage(
      "Cannot move {item} from {source} because it is currently at {actual}.",
      {
        item: "SONY ZVE-10 B",
        source: "Graúna",
        actual: "Ariel",
      }
    );

    expect(message).toBe(
      "Cannot move SONY ZVE-10 B from Graúna because it is currently at Ariel."
    );
  });
});
