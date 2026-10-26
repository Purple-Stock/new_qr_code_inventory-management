import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { getDatabaseUrl } from "./config";

type AppDb = ReturnType<typeof drizzle<typeof schema>>;

let appClient: Client | null = null;
let sqliteInstance: AppDb | null = null;

function getAppClient(): Client {
  if (!appClient) {
    appClient = createClient({
      url: getDatabaseUrl(),
    });
  }
  return appClient;
}

export function getSqlite(): AppDb {
  if (!sqliteInstance) {
    // @ts-ignore - Drizzle types may have issues with schema parameter
    sqliteInstance = drizzle(getAppClient(), { schema });
  }
  return sqliteInstance;
}

// Next collect-page-data imports API routes that pull this module in. Opening
// the live DATABASE_PATH at import time fails in the Cleat build jail (SQLITE 14).
export const sqlite = new Proxy({} as AppDb, {
  get(_target, prop) {
    return (getSqlite() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
