import { getErrorMessage, isUniqueConstraintError } from "@/lib/error-utils";

describe("error-utils", () => {
  describe("getErrorMessage", () => {
    it("returns error.message when available", () => {
      expect(getErrorMessage(new Error("boom"), "fallback")).toBe("boom");
    });

    it("returns fallback when message is unavailable", () => {
      expect(getErrorMessage({ detail: "oops" }, "fallback")).toBe("fallback");
      expect(getErrorMessage("oops", "fallback")).toBe("fallback");
      expect(getErrorMessage(null, "fallback")).toBe("fallback");
    });
  });

  describe("isUniqueConstraintError", () => {
    it("returns true for sqlite unique constraint error messages", () => {
      expect(
        isUniqueConstraintError(new Error("SQLITE_CONSTRAINT_UNIQUE: users.email"))
      ).toBe(true);
      expect(isUniqueConstraintError(new Error("UNIQUE constraint failed: users.email"))).toBe(
        true
      );
    });

    it("returns false when message does not indicate unique constraint", () => {
      expect(isUniqueConstraintError(new Error("some other failure"))).toBe(false);
      expect(isUniqueConstraintError({ code: "E_FAIL" })).toBe(false);
      expect(isUniqueConstraintError(undefined)).toBe(false);
    });
  });
});
