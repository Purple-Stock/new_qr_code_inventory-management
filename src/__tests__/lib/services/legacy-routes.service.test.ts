import { getRemovedApiV1Payload } from "@/lib/services/legacy-routes";

describe("legacy-routes service", () => {
  it("returns the payload for the removed api v1 endpoint", () => {
    expect(getRemovedApiV1Payload()).toEqual({
      error: "Legacy endpoint removed",
      message: "This legacy API endpoint is no longer available.",
    });
  });
});
