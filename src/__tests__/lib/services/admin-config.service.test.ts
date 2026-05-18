import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@/lib/errors";
import { getAdminDatabaseConfig } from "@/lib/services/admin-config";

const findUserByIdMock = vi.fn();
const isSuperAdminUserMock = vi.fn();
const getDatabaseUrlMock = vi.fn();
const readFileMock = vi.fn();

vi.mock("@/lib/db/users", () => ({
  findUserById: (...args: unknown[]) => findUserByIdMock(...args),
}));

vi.mock("@/lib/db/super-admin", () => ({
  isSuperAdminUser: (...args: unknown[]) => isSuperAdminUserMock(...args),
}));

vi.mock("@/db/config", () => ({
  getDatabaseUrl: (...args: unknown[]) => getDatabaseUrlMock(...args),
}));

vi.mock("fs", () => ({
  promises: {
    readFile: (...args: unknown[]) => readFileMock(...args),
  },
}));

describe("admin-config service", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns unauthenticated when request user is missing", async () => {
    const result = await getAdminDatabaseConfig({ requestUserId: null });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(401);
    expect(result.error.errorCode).toBe(ERROR_CODES.USER_NOT_AUTHENTICATED);
  });

  it("returns runtime and mode configuration for a super admin user", async () => {
    const superAdminEmail = `super-admin-${Date.now()}@example.com`;

    process.env.SUPER_ADMIN_EMAILS = superAdminEmail;
    process.env.NODE_ENV = "production";

    findUserByIdMock.mockResolvedValue({
      id: 42,
      email: superAdminEmail,
      role: "admin",
    });
    isSuperAdminUserMock.mockResolvedValue(false);
    getDatabaseUrlMock.mockReturnValue("libsql://active-db");
    readFileMock.mockImplementation(async (filePath: string) => {
      if (filePath.endsWith("/.env")) {
        return "DATABASE_URL=file:./src/db.sqlite\n";
      }

      if (filePath.endsWith("/.env.prod.local")) {
        return "DATABASE_URL=libsql://prod-db\nTURSO_AUTH_TOKEN=token_123\n";
      }

      throw new Error(`Unexpected file read: ${filePath}`);
    });

    const result = await getAdminDatabaseConfig({ requestUserId: 42 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.runtime).toEqual({
      nodeEnv: "production",
      activeDatabaseUrl: "libsql://active-db",
      activeDatabaseKind: "libsql",
    });
    expect(result.data.modes.local).toEqual({
      fileName: ".env",
      exists: true,
      databaseUrl: "file:./src/db.sqlite",
      databaseKind: "file",
      hasAuthToken: false,
    });
    expect(result.data.modes.prod).toEqual({
      fileName: ".env.prod.local",
      exists: true,
      databaseUrl: "libsql://prod-db",
      databaseKind: "libsql",
      hasAuthToken: true,
    });
  });
});
