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

  return `file:${defaultDatabasePath}`;
}

export function getDatabaseAuthToken(): string | undefined {
  const token = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!token || token.length === 0) {
    return undefined;
  }
  return token;
}
