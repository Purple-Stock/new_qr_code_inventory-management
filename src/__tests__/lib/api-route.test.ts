import { parseRouteParamId } from "@/lib/api-route";

describe("api-route utils", () => {
  describe("parseRouteParamId", () => {
    it("parses valid integer strings", () => {
      expect(parseRouteParamId("123")).toBe(123);
      expect(parseRouteParamId("0010")).toBe(10);
    });

    it("returns null for invalid numeric strings", () => {
      expect(parseRouteParamId("abc")).toBeNull();
      expect(parseRouteParamId("")).toBeNull();
    });
  });
});
