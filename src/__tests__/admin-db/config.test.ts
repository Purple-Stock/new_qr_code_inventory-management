import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getAdminDatabaseAuthToken,
  getAdminDatabaseUrl,
} from "@/admin-db/config";

const ENV_KEYS = [
  "ADMIN_DATABASE_URL",
  "ADMIN_DATABASE_AUTH_TOKEN",
  "DATABASE_PATH",
  "DATABASE_URL",
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "NODE_ENV",
] as const;

describe("sqlite admin database config", () => {
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

  it("uses ADMIN_DATABASE_URL when it is a local sqlite file", () => {
    process.env.ADMIN_DATABASE_URL = "file:/opt/purple-stock-app/data/admin.db";

    expect(getAdminDatabaseUrl()).toBe(
      "file:/opt/purple-stock-app/data/admin.db"
    );
  });

  it("ignores TURSO_DATABASE_URL as a fallback", () => {
    process.env.TURSO_DATABASE_URL =
      "libsql://purplestock-prod-puppe1990.aws-us-east-1.turso.io";

    expect(getAdminDatabaseUrl()).toMatch(/^file:/);
    expect(getAdminDatabaseUrl()).not.toContain("libsql://");
  });

  it("rejects remote libsql admin URLs", () => {
    process.env.ADMIN_DATABASE_URL = "libsql://admin.turso.io";

    expect(() => getAdminDatabaseUrl()).toThrow(/sqlite/i);
  });

  it("does not fall back to TURSO_AUTH_TOKEN", () => {
    process.env.TURSO_AUTH_TOKEN = "should-be-ignored";
    process.env.ADMIN_DATABASE_AUTH_TOKEN = "";

    expect(
      getAdminDatabaseAuthToken("file:/opt/purple-stock-app/data/admin.db")
    ).toBeUndefined();
  });
});
