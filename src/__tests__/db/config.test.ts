import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getDatabaseAuthToken,
  getDatabaseUrl,
} from "@/db/config";

const ENV_KEYS = [
  "DATABASE_PATH",
  "DATABASE_URL",
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "NODE_ENV",
] as const;

describe("sqlite database config", () => {
  const snapshot: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      snapshot[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = snapshot[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("prefers DATABASE_PATH over DATABASE_URL", () => {
    process.env.DATABASE_PATH = "/opt/purple-stock-app/data/purple.db";
    process.env.DATABASE_URL = "file:./src/db.sqlite";

    expect(getDatabaseUrl()).toBe("file:/opt/purple-stock-app/data/purple.db");
  });

  it("uses a local file DATABASE_URL", () => {
    process.env.DATABASE_URL = "file:./src/db.sqlite";

    expect(getDatabaseUrl()).toBe("file:./src/db.sqlite");
  });

  it("ignores TURSO_DATABASE_URL when DATABASE_URL is unset", () => {
    process.env.TURSO_DATABASE_URL =
      "libsql://purplestock-prod-puppe1990.aws-us-east-1.turso.io";
    process.env.NODE_ENV = "development";

    expect(getDatabaseUrl()).toMatch(/^file:/);
    expect(getDatabaseUrl()).not.toContain("turso");
    expect(getDatabaseUrl()).not.toContain("libsql://");
  });

  it("rejects remote libsql URLs", () => {
    process.env.DATABASE_URL =
      "libsql://purplestock-prod-puppe1990.aws-us-east-1.turso.io";

    expect(() => getDatabaseUrl()).toThrow(/sqlite/i);
    expect(() => getDatabaseUrl()).not.toThrow(/TURSO_AUTH_TOKEN/);
  });

  it("does not read TURSO_AUTH_TOKEN for a local sqlite file", () => {
    process.env.TURSO_AUTH_TOKEN = "should-be-ignored";

    expect(getDatabaseAuthToken("file:./src/db.sqlite")).toBeUndefined();
  });

  it("requires a local sqlite url in production", () => {
    process.env.NODE_ENV = "production";

    expect(() => getDatabaseUrl()).toThrow(/DATABASE_PATH|DATABASE_URL|sqlite/i);
  });
});
