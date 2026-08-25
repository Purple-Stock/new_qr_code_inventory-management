import { describe, expect, it } from "vitest";
import { buildItemNotAtSourceLocationMessage } from "@/lib/db/item-not-at-source-location-error";

describe("buildItemNotAtSourceLocationMessage", () => {
  it("tells the operator where the item actually is", () => {
    expect(
      buildItemNotAtSourceLocationMessage({
        itemName: "SONY ZVE-10 B",
        claimedSourceName: "Graúna",
        actualLocationName: "Ariel",
      })
    ).toBe(
      "Cannot move SONY ZVE-10 B from Graúna because it is currently at Ariel. Move it from Ariel, or return it to Graúna first."
    );
  });

  it("explains when the item has no current location", () => {
    expect(
      buildItemNotAtSourceLocationMessage({
        itemName: "Tamron 17-70mm",
        claimedSourceName: "Graúna",
        actualLocationName: null,
      })
    ).toBe(
      "Cannot move Tamron 17-70mm from Graúna because it is not at that location."
    );
  });
});
