import path from "path";
import { fileURLToPath } from "url";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const defaultDatabasePath = path.resolve(currentDir, "../db.sqlite");

function isRemoteDatabaseUrl(value: string): boolean {
  return /^(libsql|https?|wss):\/\//i.test(value);
}

export function toSqliteFileUrl(value: string): string {
  const trimmed = value.trim();
  if (trimmed === ":memory:" || trimmed.startsWith("file:")) {
    if (isRemoteDatabaseUrl(trimmed.slice("file:".length))) {
      throw new Error(
        `Remote database URL is not supported. Use DATABASE_PATH or a file: SQLite URL.`
      );
    }
    return trimmed;
  }

  if (isRemoteDatabaseUrl(trimmed)) {
    throw new Error(
      `Remote database URL is not supported. Use DATABASE_PATH or a file: SQLite URL.`
    );
  }

  return `file:${trimmed}`;
}

export function getDatabaseUrl(): string {
  const filePath = process.env.DATABASE_PATH?.trim();
  if (filePath && filePath.length > 0) {
    return toSqliteFileUrl(filePath);
  }

  const configured = process.env.DATABASE_URL?.trim();
  if (configured && configured.length > 0) {
    return toSqliteFileUrl(configured);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_PATH or a file: DATABASE_URL must be set in production"
    );
  }

  return `file:${defaultDatabasePath}`;
}

export function getDatabaseAuthToken(_databaseUrl: string): string | undefined {
  return undefined;
}