import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@/db/schema";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const testHelpersDir = path.dirname(__filename);
const testDbPath = path.resolve(testHelpersDir, "../../db.test.sqlite");

let testDb: Client | null = null;
let testDrizzle: ReturnType<typeof drizzle> | null = null;

/**
 * Get or create a test database (libSQL file DB prepared in Jest global setup)
 */
export function getTestDb(): {
  db: Client;
  drizzle: ReturnType<typeof drizzle>;
} {
  if (testDb && testDrizzle) {
    return { db: testDb, drizzle: testDrizzle };
  }

  const databaseUrl = process.env.DATABASE_URL?.trim() || `file:${testDbPath}`;
  testDb = createClient({ url: databaseUrl });

  // @ts-ignore - Drizzle types may have issues with schema parameter
  testDrizzle = drizzle(testDb, { schema });

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

  await testDb.batch(
    [
      { sql: "PRAGMA foreign_keys = ON" },
      { sql: "DELETE FROM webhooks" },
      { sql: "DELETE FROM api_keys" },
      { sql: "DELETE FROM stock_transactions" },
      { sql: "DELETE FROM items" },
      { sql: "DELETE FROM locations" },
      { sql: "DELETE FROM team_members" },
      { sql: "DELETE FROM company_members" },
      { sql: "DELETE FROM teams" },
      { sql: "DELETE FROM companies" },
      { sql: "DELETE FROM users" },
    ],
    "write"
  );
}
