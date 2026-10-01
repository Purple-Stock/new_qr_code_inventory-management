import { isValidServerActionId } from "@/lib/server-action-id";

describe("isValidServerActionId", () => {
  it("rejects the scanner payload that Next.js logs as Received \"x\"", () => {
    expect(isValidServerActionId("x")).toBe(false);
  });

  it("rejects empty and short ids", () => {
    expect(isValidServerActionId("")).toBe(false);
    expect(isValidServerActionId("abc")).toBe(false);
  });

  it("accepts a 42-character Next.js server reference id", () => {
    const id = "a".repeat(42);
    expect(isValidServerActionId(id)).toBe(true);
  });
});
