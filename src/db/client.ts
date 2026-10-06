import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { getDatabaseUrl } from "./config";

const db = createClient({
  url: getDatabaseUrl(),
});

// @ts-ignore - Drizzle types may have issues with schema parameter
export const sqlite = drizzle(db, { schema });
