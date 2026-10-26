import { beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.fn(() => {
  throw new Error("opened sqlite during import");
});

vi.mock("@libsql/client", () => ({
  createClient,
}));

vi.mock("drizzle-orm/libsql", () => ({
  drizzle: vi.fn(() => ({ select: vi.fn() })),
}));

describe("app sqlite client", () => {
  beforeEach(() => {
    vi.resetModules();
    createClient.mockClear();
    process.env.DATABASE_PATH = "/no/such/dir/purple.db";
    process.env.NODE_ENV = "production";
  });

  it("does not open sqlite when the module is imported", async () => {
    await expect(import("@/db/client")).resolves.toMatchObject({
      sqlite: expect.anything(),
    });
    expect(createClient).not.toHaveBeenCalled();
  });
});
