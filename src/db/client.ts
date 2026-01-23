// @ts-ignore - better-sqlite3 types may not be available
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use absolute path to ensure it works from any directory
const databaseUrl =
  process.env.DATABASE_URL ||
  path.resolve(__dirname, "../db.sqlite");

const db = new Database(databaseUrl);

// Enable foreign keys
db.pragma("foreign_keys = ON");

// @ts-ignore - Drizzle types may have issues with schema parameter
export const sqlite = drizzle(db, { schema });
