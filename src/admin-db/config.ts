import path from "path";
import { fileURLToPath } from "url";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const defaultAdminDatabasePath = path.resolve(currentDir, "../admin.sqlite");

export function getAdminDatabaseUrl(): string {
  const configured = process.env.ADMIN_DATABASE_URL?.trim();
  if (configured && configured.length > 0) {
    return configured;
  }

  return `file:${defaultAdminDatabasePath}`;
}

export function getAdminDatabaseAuthToken(databaseUrl: string): string | undefined {
  const token = process.env.ADMIN_DATABASE_AUTH_TOKEN?.trim();
  const isRemoteLibsql = databaseUrl.startsWith("libsql://");

  if (token && token.length > 0) {
    return token;
  }

  if (isRemoteLibsql && process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_DATABASE_AUTH_TOKEN must be set in production for libsql:// ADMIN_DATABASE_URL");
  }

  return undefined;
}
