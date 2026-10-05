import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "src/db/migrations");

function isRemoteDatabaseUrl(value) {
  return /^(libsql|https?|wss):\/\//i.test(value);
}

function toSqliteFileUrl(value) {
  const trimmed = value.trim();
  if (trimmed === ":memory:" || trimmed.startsWith("file:")) {
    return trimmed;
  }
  if (isRemoteDatabaseUrl(trimmed)) {
    throw new Error(
      "Remote database URL is not supported. Use DATABASE_PATH or a file: SQLite URL."
    );
  }
  return `file:${trimmed}`;
}

function getDatabaseUrl() {
  const filePath = process.env.DATABASE_PATH?.trim();
  if (filePath) return toSqliteFileUrl(filePath);

  const configured = process.env.DATABASE_URL?.trim();
  if (configured) return toSqliteFileUrl(configured);

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_PATH or a file: DATABASE_URL must be set in production"
    );
  }

  return `file:${path.join(root, "src/db.sqlite")}`;
}

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

export async function applySqliteMigrations() {
  const url = getDatabaseUrl();
  const now = Math.floor(Date.now() / 1000);
  let appliedCount = 0;

  const bootstrap = createClient({ url });
  try {
    await bootstrap.execute(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL UNIQUE,
        applied_at INTEGER NOT NULL
      )
    `);
    const applied = await bootstrap.execute("SELECT filename FROM _migrations");
    const appliedSet = new Set(
      applied.rows.map((row) => String(row.filename ?? "")).filter(Boolean)
    );

    for (const file of listMigrationFiles()) {
      if (appliedSet.has(file)) continue;

      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      const statements = toSqlStatements(sql).map((statement) => ({ sql: statement }));
      const client = createClient({ url });
      try {
        await client.batch(
          [
            { sql: "PRAGMA foreign_keys = ON" },
            ...statements,
            {
              sql: "INSERT INTO _migrations (filename, applied_at) VALUES (?, ?)",
              args: [file, now],
            },
          ],
          "write"
        );
      } finally {
        client.close();
      }

      appliedCount += 1;
      console.log(`Applied migration: ${file}`);
    }
  } finally {
    bootstrap.close();
  }

  if (appliedCount > 0) {
    console.log("Database initialized successfully.");
  } else {
    console.log("Database is up to date.");
  }
}

const isDirectRun = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isDirectRun) {
  applySqliteMigrations().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
