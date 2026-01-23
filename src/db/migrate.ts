import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const databaseUrl = process.env.DATABASE_URL || path.resolve(currentDir, "../db.sqlite");
const migrationsDir = path.resolve(currentDir, "migrations");

const db = new Database(databaseUrl);

db.pragma("foreign_keys = ON");

db.exec(
  "CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, filename TEXT NOT NULL UNIQUE, applied_at INTEGER NOT NULL)"
);

type MigrationRow = { filename: string };
const applied = db
  .prepare("SELECT filename FROM _migrations")
  .all() as MigrationRow[];
const appliedSet = new Set(applied.map((row) => row.filename));

const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const now = Math.floor(Date.now() / 1000);

for (const file of migrationFiles) {
  if (appliedSet.has(file)) {
    continue;
  }

  const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
  db.exec(sql);
  db.prepare("INSERT INTO _migrations (filename, applied_at) VALUES (?, ?)").run(file, now);
  console.log(`Applied ${file}`);
}

console.log("Migrations complete.");
