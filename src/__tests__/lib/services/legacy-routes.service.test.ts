import { describe, expect, it } from "vitest";
import { getRemovedApiV1Payload } from "@/lib/services/legacy-routes";

describe("legacy-routes service", () => {
  it("returns the removed v1 payload", () => {
    expect(getRemovedApiV1Payload()).toEqual({
      error: "Legacy endpoint removed",
      message: "This legacy API endpoint is no longer available.",
    });
  });
});
