import { describe, expect, it } from "vitest";
import { binaryResponse, parseRouteParamId, parseRouteParamIds } from "@/lib/api-route";

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

  describe("binaryResponse", () => {
    it("returns the raw bytes with content type and a long public cache", async () => {
      const body = Uint8Array.from([0xff, 0xd8, 0xff]);
      const response = binaryResponse(body, "image/jpeg");

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("image/jpeg");
      expect(response.headers.get("cache-control")).toContain("public");
      expect(response.headers.get("cache-control")).toContain("max-age=31536000");
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(body);
    });
  });
});
