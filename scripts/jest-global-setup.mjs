import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const rootDir = path.resolve(currentDir, "..");
const migrationsDir = path.resolve(rootDir, "src/db/migrations");
const testDbPath = path.resolve(rootDir, "src/db.test.sqlite");

function listMigrationFiles() {
  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql") && !file.endsWith(".down.sql"))
    .sort();
}

function toSqlStatements(sql) {
  return sql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

export default async function globalSetup() {
  if (fs.existsSync(testDbPath)) {
    fs.rmSync(testDbPath, { force: true });
  }

  process.env.DATABASE_URL = `file:${testDbPath}`;

  const client = createClient({
    url: process.env.DATABASE_URL,
  });

  try {
    await client.execute("PRAGMA foreign_keys = ON");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL UNIQUE,
        applied_at INTEGER NOT NULL
      )
    `);

    const now = Math.floor(Date.now() / 1000);
    const migrationFiles = listMigrationFiles();
    for (const file of migrationFiles) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      const statements = toSqlStatements(sql).map((statement) => ({ sql: statement }));

      if (statements.length === 0) {
        continue;
      }

      await client.batch(
        [
          { sql: "PRAGMA foreign_keys = ON" },
          ...statements,
          {
            sql: "INSERT OR IGNORE INTO _migrations (filename, applied_at) VALUES (?, ?)",
            args: [file, now],
          },
        ],
        "write"
      );
    }
  } finally {
    client.close();
  }
}
