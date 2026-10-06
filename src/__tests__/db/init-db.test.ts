import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ensureDatabase } from "@/db/init-db";

describe("ensureDatabase", () => {
  const envKeys = ["DATABASE_PATH", "DATABASE_URL", "NODE_ENV"] as const;
  const snapshot: Record<string, string | undefined> = {};
  let dir = "";

  beforeEach(() => {
    for (const key of envKeys) {
      snapshot[key] = process.env[key];
      delete process.env[key];
    }
    dir = mkdtempSync(join(tmpdir(), "purple-stock-migrate-"));
  });

  afterEach(() => {
    for (const key of envKeys) {
      const value = snapshot[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    rmSync(dir, { recursive: true, force: true });
  });

  it("applies users.phone so login can select the drizzle schema", async () => {
    const databasePath = join(dir, "purple.db");
    process.env.DATABASE_PATH = databasePath;

    await ensureDatabase();

    const client = createClient({ url: `file:${databasePath}` });
    try {
      const columns = await client.execute("PRAGMA table_info(users)");
      const names = columns.rows.map((row) => String(row.name));
      expect(names).toContain("phone");

      const applied = await client.execute(
        "SELECT filename FROM _migrations WHERE filename = '011_add_users_phone.sql'"
      );
      expect(applied.rows).toHaveLength(1);
    } finally {
      client.close();
    }
  });
});
