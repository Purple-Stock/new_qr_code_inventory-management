import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { afterEach, describe, expect, it } from "vitest";

const root = process.cwd();

describe("cleat start applies sqlite migrations", () => {
  let dir = "";

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("runs apply-sqlite-migrations.mjs before next start", () => {
    const deploy = JSON.parse(
      readFileSync(join(root, ".cleat_deploy/deploy.json"), "utf8")
    ) as { start_command?: string };
    const startSh = readFileSync(join(root, ".cleat_deploy/start.sh"), "utf8");

    expect(deploy.start_command).toBe("bash .cleat_deploy/start.sh");
    expect(startSh).toContain("scripts/apply-sqlite-migrations.mjs");
    expect(startSh).toContain("next start");
    expect(startSh).not.toMatch(/turso/i);
  });

  it("applies users.phone on an empty sqlite file", async () => {
    dir = mkdtempSync(join(tmpdir(), "purple-stock-start-migrate-"));
    const databasePath = join(dir, "purple.db");

    execFileSync("node", [join(root, "scripts/apply-sqlite-migrations.mjs")], {
      env: { ...process.env, DATABASE_PATH: databasePath, NODE_ENV: "production" },
      encoding: "utf8",
    });

    const client = createClient({ url: `file:${databasePath}` });
    try {
      const columns = await client.execute("PRAGMA table_info(users)");
      expect(columns.rows.map((row) => String(row.name))).toContain("phone");
    } finally {
      client.close();
    }
  });
});

