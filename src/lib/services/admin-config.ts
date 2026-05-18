import path from "path";
import { promises as fs } from "fs";
import { fileURLToPath } from "url";
import { getDatabaseUrl } from "@/db/config";
import { findUserById } from "@/lib/db/users";
import { isSuperAdminUser } from "@/lib/db/super-admin";
import { ERROR_CODES } from "@/lib/errors";
import { internalServiceError, makeServiceError } from "@/lib/services/errors";
import type { ServiceResult } from "@/lib/services/types";

const currentFile = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(currentFile), "../../");

function isEmailInSuperAdminAllowlist(email: string): boolean {
  const raw = process.env.SUPER_ADMIN_EMAILS?.trim();
  if (!raw) return false;
  const set = new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0)
  );
  return set.has(email.trim().toLowerCase());
}

async function ensureSuperAdminAccess(requestUserId: number | null) {
  if (!requestUserId) {
    return {
      ok: false as const,
      error: makeServiceError(401, ERROR_CODES.USER_NOT_AUTHENTICATED, "User not authenticated"),
    };
  }

  const requestUser = await findUserById(requestUserId);
  if (!requestUser) {
    return {
      ok: false as const,
      error: makeServiceError(401, ERROR_CODES.USER_NOT_AUTHENTICATED, "User not authenticated"),
    };
  }

  const hasSuperAdminAccess =
    requestUser.role === "super_admin" ||
    (await isSuperAdminUser(requestUser.id)) ||
    isEmailInSuperAdminAllowlist(requestUser.email);
  if (!hasSuperAdminAccess) {
    return {
      ok: false as const,
      error: makeServiceError(
        403,
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        "Super admin access required"
      ),
    };
  }

  return { ok: true as const, data: requestUser };
}

function parseEnvValue(raw: string, key: string): string | null {
  const line = raw
    .split("\n")
    .find((entry) => entry.trim().startsWith(`${key}=`));

  if (!line) return null;
  const value = line.slice(line.indexOf("=") + 1).trim();
  return value.length > 0 ? value : null;
}

function databaseKind(databaseUrl: string | null): "libsql" | "file" | "missing" {
  if (!databaseUrl) return "missing";
  if (databaseUrl.startsWith("libsql://")) return "libsql";
  if (databaseUrl.startsWith("file:")) return "file";
  return "missing";
}

async function readDatabaseTargetFromEnvFile(fileName: string, fallbackUrl?: string) {
  const fullPath = path.join(projectRoot, fileName);

  try {
    const raw = await fs.readFile(fullPath, "utf8");
    const databaseUrl = parseEnvValue(raw, "DATABASE_URL") ?? fallbackUrl ?? null;
    const hasAuthToken = !!parseEnvValue(raw, "TURSO_AUTH_TOKEN");

    return {
      fileName,
      exists: true,
      databaseUrl,
      databaseKind: databaseKind(databaseUrl),
      hasAuthToken,
    };
  } catch {
    return {
      fileName,
      exists: false,
      databaseUrl: fallbackUrl ?? null,
      databaseKind: databaseKind(fallbackUrl ?? null),
      hasAuthToken: false,
    };
  }
}

export async function getAdminDatabaseConfig(params: {
  requestUserId: number | null;
}): Promise<
  ServiceResult<{
    runtime: {
      nodeEnv: string;
      activeDatabaseUrl: string;
      activeDatabaseKind: "libsql" | "file" | "missing";
    };
    modes: {
      local: {
        fileName: string;
        exists: boolean;
        databaseUrl: string | null;
        databaseKind: "libsql" | "file" | "missing";
        hasAuthToken: boolean;
      };
      prod: {
        fileName: string;
        exists: boolean;
        databaseUrl: string | null;
        databaseKind: "libsql" | "file" | "missing";
        hasAuthToken: boolean;
      };
    };
  }>
> {
  const access = await ensureSuperAdminAccess(params.requestUserId);
  if (!access.ok) {
    return access;
  }

  try {
    const activeDatabaseUrl = getDatabaseUrl();
    const localMode = await readDatabaseTargetFromEnvFile(".env", "file:./src/db.sqlite");
    const prodMode = await readDatabaseTargetFromEnvFile(".env.prod.local");

    return {
      ok: true,
      data: {
        runtime: {
          nodeEnv: process.env.NODE_ENV || "development",
          activeDatabaseUrl,
          activeDatabaseKind: databaseKind(activeDatabaseUrl),
        },
        modes: {
          local: localMode,
          prod: prodMode,
        },
      },
    };
  } catch (error) {
    console.error("Error loading admin database config:", error);
    return {
      ok: false,
      error: internalServiceError("An error occurred while loading database config"),
    };
  }
}
