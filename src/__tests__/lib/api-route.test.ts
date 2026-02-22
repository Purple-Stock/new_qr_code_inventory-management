import { vi } from "vitest";
import { parseRouteParamId, parseRouteParamIds } from "@/lib/api-route";

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

  describe("parseRouteParamIds", () => {
    it("parses multiple ids while preserving keys", () => {
      expect(parseRouteParamIds({ teamId: "12", itemId: "003" })).toEqual({
        teamId: 12,
        itemId: 3,
      });
    });

    it("returns null for invalid values", () => {
      expect(parseRouteParamIds({ teamId: "x", itemId: "9" })).toEqual({
        teamId: null,
        itemId: 9,
      });
    });
  });
});
