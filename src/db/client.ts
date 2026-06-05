import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { ensureDatabase } from "./init-db";
import * as schema from "./schema";
import { getDatabaseAuthToken, getDatabaseUrl } from "./config";

const databaseUrl = getDatabaseUrl();

const db = createClient({
  url: databaseUrl,
  authToken: getDatabaseAuthToken(databaseUrl),
});

let databaseReady: Promise<void> | null = null;

export function waitForDatabase(): Promise<void> {
  if (!databaseReady) {
    databaseReady = ensureDatabase().catch((error) => {
      databaseReady = null;
      throw error;
    });
  }

  return databaseReady;
}

// @ts-ignore - Drizzle types may have issues with schema parameter
export const sqlite = drizzle(db, { schema });
