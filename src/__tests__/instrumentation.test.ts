import { execFileSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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

  it("drops leftover Next route-cache after migrations and before next start", () => {
    const startSh = readFileSync(join(root, ".cleat_deploy/start.sh"), "utf8");
    const migrateIndex = startSh.indexOf("scripts/apply-sqlite-migrations.mjs");
    const dropRouteCache = startSh.search(
      /rm -rf[^\n]*\.next\/server\/route-cache/
    );
    const dropBuildCache = startSh.search(/rm -rf[^\n]*\.next\/cache/);
    const startIndex = startSh.indexOf("next start");

    expect(migrateIndex).toBeGreaterThan(-1);
    expect(dropRouteCache).toBeGreaterThan(migrateIndex);
    expect(dropBuildCache).toBeGreaterThan(migrateIndex);
    expect(startIndex).toBeGreaterThan(dropRouteCache);
    expect(startIndex).toBeGreaterThan(dropBuildCache);
  });

  it("removes overlay leftover route-cache before exec next start", () => {
    dir = mkdtempSync(join(tmpdir(), "purple-stock-start-cache-"));
    mkdirSync(join(dir, ".cleat_deploy"));
    mkdirSync(join(dir, "scripts"));
    mkdirSync(join(dir, "bin"));
    mkdirSync(join(dir, ".next/server/route-cache"), { recursive: true });
    mkdirSync(join(dir, ".next/cache"), { recursive: true });
    writeFileSync(join(dir, ".next/server/route-cache/stale"), "old html");
    writeFileSync(join(dir, ".next/cache/stale"), "old build");
    writeFileSync(join(dir, "scripts/apply-sqlite-migrations.mjs"), "");
    copyFileSync(
      join(root, ".cleat_deploy/start.sh"),
      join(dir, ".cleat_deploy/start.sh")
    );
    chmodSync(join(dir, ".cleat_deploy/start.sh"), 0o755);

    const logPath = join(dir, "boot.log");
    writeFileSync(
      join(dir, "bin/node"),
      `#!/bin/sh\necho migrate >> "${logPath}"\nexit 0\n`
    );
    writeFileSync(
      join(dir, "bin/npx"),
      `#!/bin/sh
echo start >> "${logPath}"
if [ -e "${dir}/.next/server/route-cache/stale" ] || [ -e "${dir}/.next/cache/stale" ]; then
  echo leftover >> "${logPath}"
  exit 2
fi
exit 0
`
    );
    chmodSync(join(dir, "bin/node"), 0o755);
    chmodSync(join(dir, "bin/npx"), 0o755);

    execFileSync("bash", [join(dir, ".cleat_deploy/start.sh")], {
      encoding: "utf8",
      env: {
        PATH: `${join(dir, "bin")}:${process.env.PATH ?? "/usr/bin"}`,
        HOME: dir,
        PORT: "4037",
      },
    });

    expect(existsSync(join(dir, ".next/server/route-cache/stale"))).toBe(false);
    expect(existsSync(join(dir, ".next/cache/stale"))).toBe(false);
    expect(readFileSync(logPath, "utf8")).toBe("migrate\nstart\n");
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

