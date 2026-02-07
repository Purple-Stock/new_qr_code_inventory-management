import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/db/schema";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let testDb: Database.Database | null = null;
let testDrizzle: ReturnType<typeof drizzle> | null = null;

/**
 * Get or create a test database (in-memory SQLite)
 */
export function getTestDb(): {
  db: Database.Database;
  drizzle: ReturnType<typeof drizzle>;
} {
  if (testDb && testDrizzle) {
    return { db: testDb, drizzle: testDrizzle };
  }

  // Use in-memory database for tests
  testDb = new Database(":memory:");
  testDb.pragma("foreign_keys = ON");

  // @ts-ignore - Drizzle types may have issues with schema parameter
  testDrizzle = drizzle(testDb, { schema });

  // Run migrations
  const migrationsDir = path.resolve(__dirname, "../../db/migrations");
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    testDb.exec(sql);
  }

  return { db: testDb, drizzle: testDrizzle };
}

/**
 * Clean up test database
 */
export function cleanupTestDb() {
  if (testDb) {
    testDb.close();
    testDb = null;
    testDrizzle = null;
  }
}

/**
 * Clear all data from test database
 */
export async function clearTestDb() {
  if (!testDb) return;

  // Delete all data from tables (in reverse order of dependencies)
  testDb.exec("DELETE FROM webhooks");
  testDb.exec("DELETE FROM api_keys");
  testDb.exec("DELETE FROM stock_transactions");
  testDb.exec("DELETE FROM items");
  testDb.exec("DELETE FROM locations");
  testDb.exec("DELETE FROM team_members");
  testDb.exec("DELETE FROM company_members");
  testDb.exec("DELETE FROM teams");
  testDb.exec("DELETE FROM companies");
  testDb.exec("DELETE FROM users");
}
