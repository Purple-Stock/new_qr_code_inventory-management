import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const databaseUrl = process.env.DATABASE_URL || path.resolve(currentDir, "../db.sqlite");
const migrationsDir = path.resolve(currentDir, "migrations");

function parseSteps(argv: string[]): number {
  const stepsArg = argv.find((arg) => arg.startsWith("--steps="));
  const shortArgIndex = argv.findIndex((arg) => arg === "--steps" || arg === "-s");

  if (!stepsArg && shortArgIndex === -1) {
    return 1;
  }

  const raw =
    stepsArg?.split("=")[1] ??
    (shortArgIndex >= 0 ? argv[shortArgIndex + 1] : undefined);
  const parsed = Number.parseInt(raw ?? "", 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("Invalid --steps value. Use a positive integer.");
  }

  return parsed;
}

type AppliedMigration = {
  id: number;
  filename: string;
};

function getDownFilename(filename: string): string {
  return filename.replace(/\.sql$/i, ".down.sql");
}

const db = new Database(databaseUrl);
db.pragma("foreign_keys = ON");
db.exec(
  "CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, filename TEXT NOT NULL UNIQUE, applied_at INTEGER NOT NULL)"
);

let transactionStarted = false;

try {
  const steps = parseSteps(process.argv.slice(2));
  const applied = db
    .prepare("SELECT id, filename FROM _migrations ORDER BY id DESC LIMIT ?")
    .all(steps) as AppliedMigration[];

  if (applied.length === 0) {
    console.log("No applied migrations found.");
    process.exit(0);
  }

  // Validate all down scripts before mutating the database.
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

  db.exec("BEGIN");
  transactionStarted = true;

  for (const rollback of rollbacks) {
    db.exec(rollback.sql);
    db.prepare("DELETE FROM _migrations WHERE id = ?").run(rollback.migration.id);
    console.log(`Rolled back ${rollback.migration.filename} using ${rollback.downFile}`);
  }

  db.exec("COMMIT");
  transactionStarted = false;
  console.log(`Rollback complete. Steps: ${rollbacks.length}.`);
} catch (error) {
  if (transactionStarted) {
    db.exec("ROLLBACK");
  }
  if (error instanceof Error) {
    console.error(`Rollback failed: ${error.message}`);
  } else {
    console.error("Rollback failed.");
  }
  process.exit(1);
} finally {
  db.close();
}
