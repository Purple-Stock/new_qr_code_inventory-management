import path from "path";
import { fileURLToPath } from "url";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const defaultDatabasePath = path.resolve(currentDir, "../db.sqlite");

export function getDatabaseUrl(): string {
  const configured = process.env.DATABASE_URL?.trim();
  if (configured && configured.length > 0) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL must be set in production");
  }

  return `file:${defaultDatabasePath}`;
}

export function getDatabaseAuthToken(databaseUrl: string): string | undefined {
  const token = process.env.TURSO_AUTH_TOKEN?.trim();
  const isRemoteLibsql = databaseUrl.startsWith("libsql://");

  if (token && token.length > 0) {
    return token;
  }

  if (isRemoteLibsql && process.env.NODE_ENV === "production") {
    throw new Error("TURSO_AUTH_TOKEN must be set in production for libsql:// DATABASE_URL");
  }

  return undefined;
}
