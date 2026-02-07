import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = process.env.DATABASE_URL || path.resolve(__dirname, "../db.sqlite");
const migrationsDir = path.resolve(__dirname, "migrations");

// Check if database exists, if not, create it and run migrations
export function ensureDatabase() {
  try {
    const db = new Database(databaseUrl);
    db.pragma("foreign_keys = ON");

  // Create migrations table if it doesn't exist
  db.exec(
    "CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, filename TEXT NOT NULL UNIQUE, applied_at INTEGER NOT NULL)"
  );

  // Check if migrations have been run
  type MigrationRow = { filename: string };
  const applied = db
    .prepare("SELECT filename FROM _migrations")
    .all() as MigrationRow[];
  const appliedSet = new Set(applied.map((row) => row.filename));

  // Get migration files
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql") && !file.endsWith(".down.sql"))
    .sort();

  const now = Math.floor(Date.now() / 1000);
  let hasNewMigrations = false;

  // Run any pending migrations
  for (const file of migrationFiles) {
    if (appliedSet.has(file)) {
      continue;
    }

    hasNewMigrations = true;
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    db.exec(sql);
    db.prepare("INSERT INTO _migrations (filename, applied_at) VALUES (?, ?)").run(file, now);
    console.log(`Applied migration: ${file}`);
  }

    if (hasNewMigrations) {
      console.log("Database initialized successfully.");
    } else if (migrationFiles.length > 0) {
      console.log("Database is up to date.");
    }

    db.close();
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  ensureDatabase();
}
