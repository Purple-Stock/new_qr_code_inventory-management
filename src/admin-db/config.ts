import path from "path";
import { fileURLToPath } from "url";
import { toSqliteFileUrl } from "@/db/config";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const defaultAdminDatabasePath = path.resolve(currentDir, "../admin.sqlite");

export function getAdminDatabaseUrl(): string {
  const configured = process.env.ADMIN_DATABASE_URL?.trim();
  if (configured && configured.length > 0) {
    return toSqliteFileUrl(configured);
  }

  const filePath = process.env.DATABASE_PATH?.trim();
  if (filePath && filePath.length > 0) {
    return toSqliteFileUrl(filePath);
  }

  const mainDbUrl = process.env.DATABASE_URL?.trim();
  if (mainDbUrl && mainDbUrl.length > 0) {
    return toSqliteFileUrl(mainDbUrl);
  }

  return `file:${defaultAdminDatabasePath}`;
}

export function getAdminDatabaseAuthToken(
  _databaseUrl: string
): string | undefined {
  return undefined;
}