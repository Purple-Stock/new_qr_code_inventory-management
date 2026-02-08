import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDatabaseAuthToken, getDatabaseUrl } from "./config";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const migrationsDir = path.resolve(currentDir, "migrations");

type MigrationRow = {
  id?: number | null;
  filename?: string | null;
};

function listMigrationFiles(): string[] {
  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql") && !file.endsWith(".down.sql"))
    .sort();
}

function getDownFilename(filename: string): string {
  return filename.replace(/\.sql$/i, ".down.sql");
}

function createDbClient() {
  return createClient({
    url: getDatabaseUrl(),
    authToken: getDatabaseAuthToken(),
  });
}

async function ensureMigrationsTable() {
  const client = createDbClient();
  await client.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL
    )
  `);
  client.close();
}

async function getAppliedMigrationFilenames(): Promise<Set<string>> {
  const client = createDbClient();
  const result = await client.execute("SELECT filename FROM _migrations");
  client.close();

  const filenames = result.rows
    .map((row) => String((row as MigrationRow).filename ?? ""))
    .filter((filename) => filename.length > 0);

  return new Set(filenames);
}

export async function ensureDatabase(): Promise<void> {
  await ensureMigrationsTable();

  const appliedSet = await getAppliedMigrationFilenames();
  const migrationFiles = listMigrationFiles();
  const now = Math.floor(Date.now() / 1000);
  let hasNewMigrations = false;

  for (const file of migrationFiles) {
    if (appliedSet.has(file)) {
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const client = createDbClient();
    try {
      await client.execute("BEGIN");
      await client.execute("PRAGMA foreign_keys = ON");
      await client.execute(sql);
      await client.execute({
        sql: "INSERT INTO _migrations (filename, applied_at) VALUES (?, ?)",
        args: [file, now],
      });
      await client.execute("COMMIT");
    } catch (error) {
      await client.execute("ROLLBACK");
      throw error;
    } finally {
      client.close();
    }

    hasNewMigrations = true;
    console.log(`Applied migration: ${file}`);
  }

  if (hasNewMigrations) {
    console.log("Database initialized successfully.");
  } else if (migrationFiles.length > 0) {
    console.log("Database is up to date.");
  }
}

export async function rollbackDatabase(steps: number): Promise<void> {
  await ensureMigrationsTable();

  const client = createDbClient();
  const appliedResult = await client.execute({
    sql: "SELECT id, filename FROM _migrations ORDER BY id DESC LIMIT ?",
    args: [steps],
  });
  const applied = appliedResult.rows
    .map((row) => ({
      id: Number((row as MigrationRow).id),
      filename: String((row as MigrationRow).filename ?? ""),
    }))
    .filter((row) => Number.isInteger(row.id) && row.id > 0 && row.filename.length > 0);
  client.close();

  if (applied.length === 0) {
    console.log("No applied migrations found.");
    return;
  }

  const rollbacks = applied.map((migration) => {
    const downFile = getDownFilename(migration.filename);
    const downPath = path.join(migrationsDir, downFile);

    if (!fs.existsSync(downPath)) {
      throw new Error(
        `Missing rollback file for ${migration.filename}. Expected ${downFile}.`
      );
    }

    const sql = fs.readFileSync(downPath, "utf8");
    return { migration, downFile, sql };
  });

  for (const rollback of rollbacks) {
    const rollbackClient = createDbClient();
    try {
      await rollbackClient.execute("BEGIN");
      await rollbackClient.execute("PRAGMA foreign_keys = ON");
      await rollbackClient.execute(rollback.sql);
      await rollbackClient.execute({
        sql: "DELETE FROM _migrations WHERE id = ?",
        args: [rollback.migration.id],
      });
      await rollbackClient.execute("COMMIT");
    } catch (error) {
      await rollbackClient.execute("ROLLBACK");
      throw error;
    } finally {
      rollbackClient.close();
    }

    console.log(
      `Rolled back ${rollback.migration.filename} using ${rollback.downFile}`
    );
  }

  console.log(`Rollback complete. Steps: ${rollbacks.length}.`);
}
