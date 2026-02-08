import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { getDatabaseAuthToken, getDatabaseUrl } from "./config";

const databaseUrl = getDatabaseUrl();

const db = createClient({
  url: databaseUrl,
  authToken: getDatabaseAuthToken(databaseUrl),
});

// @ts-ignore - Drizzle types may have issues with schema parameter
export const sqlite = drizzle(db, { schema });
