import { loginUser, signupUser } from "@/lib/services/auth";
import { ERROR_CODES } from "@/lib/errors";
import { getTestDb, cleanupTestDb, clearTestDb } from "../../helpers/test-db";
import { users } from "@/db/schema";
import { createUser } from "@/lib/db/users";

jest.mock("@/db/client", () => {
  const { getTestDb } = require("../../helpers/test-db");
  const { drizzle } = getTestDb();
  return { sqlite: drizzle };
});

describe("auth service", () => {
  beforeEach(async () => {
    await clearTestDb();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  it("returns validation error for invalid login payload", async () => {
    const result = await loginUser({ payload: {} });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(400);
    expect(result.error.errorCode).toBe(ERROR_CODES.VALIDATION_ERROR);
  });

  it("logs in with valid credentials", async () => {
    await createUser({
      email: "auth-login@example.com",
      password: "password123",
      role: "admin",
    });

    const result = await loginUser({
      payload: { email: "auth-login@example.com", password: "password123" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.user.email).toBe("auth-login@example.com");
    expect("passwordHash" in result.data.user).toBe(false);
  });

  it("returns conflict when signup email already exists", async () => {
    const { drizzle } = getTestDb();
    await drizzle.insert(users).values({
      email: "exists@example.com",
      passwordHash: "hash",
      role: "admin",
    });

    const result = await signupUser({
      payload: {
        companyName: "Acme",
        email: "exists@example.com",
        password: "password123",
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(409);
    expect(result.error.errorCode).toBe(ERROR_CODES.EMAIL_ALREADY_IN_USE);
  });

  it("creates user and company on signup", async () => {
    const result = await signupUser({
      payload: {
        companyName: "Acme New",
        email: "new-owner@example.com",
        password: "password123",
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.user.email).toBe("new-owner@example.com");
    expect(result.data.company.name).toBe("Acme New");
    expect("passwordHash" in result.data.user).toBe(false);
  });
});
