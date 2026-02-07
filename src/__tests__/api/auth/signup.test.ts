import { POST } from "@/app/api/auth/signup/route";
import { NextRequest } from "next/server";
import { getTestDb, cleanupTestDb, clearTestDb } from "../../helpers/test-db";
import { users, companies, companyMembers } from "@/db/schema";
import { eq } from "drizzle-orm";

// Mock the database client before importing the route
jest.mock("@/db/client", () => {
  const { getTestDb } = require("../../helpers/test-db");
  const { drizzle } = getTestDb();
  return {
    sqlite: drizzle,
  };
});

describe("/api/auth/signup", () => {
  beforeEach(async () => {
    await clearTestDb();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  describe("POST", () => {
    it("should create a new user successfully", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          companyName: "Acme Inc",
          email: "test@example.com",
          password: "password123",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toBe("User created successfully");
      expect(data.user).toHaveProperty("email", "test@example.com");
      expect(data.user).not.toHaveProperty("passwordHash");
      expect(data.user).toHaveProperty("id");
      expect(data.company).toHaveProperty("name", "Acme Inc");
    });

    it("should return 400 if company name is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email, password and company name are required");
    });

    it("should return 400 if email is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          companyName: "Acme Inc",
          password: "password123",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email, password and company name are required");
    });

    it("should return 400 if password is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          companyName: "Acme Inc",
          email: "test@example.com",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email, password and company name are required");
    });

    it("should return 400 if password is too short", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          companyName: "Acme Inc",
          email: "test@example.com",
          password: "12345", // Less than 6 characters
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Password must be at least 6 characters");
    });

    it("should return 409 if user already exists", async () => {
      // Create a user first
      const { drizzle: testDrizzle } = getTestDb();
      await testDrizzle.insert(users).values({
        email: "existing@example.com",
        passwordHash: "$2b$10$hashed_password_example_here",
      });

      const request = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          companyName: "Acme Inc",
          email: "existing@example.com",
          password: "password123",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("User with this email already exists");
    });

    it("should hash the password before storing", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          companyName: "Acme Inc",
          email: "hashed@example.com",
          password: "password123",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      // Verify password is hashed in database
      const { drizzle: testDrizzle } = getTestDb();
      const [user] = await testDrizzle
        .select()
        .from(users)
        .where(eq(users.email, "hashed@example.com"))
        .limit(1);

      expect(user).toBeDefined();
      expect(user?.passwordHash).toBeDefined();
      expect(user?.passwordHash).not.toBe("password123");
      expect(user?.passwordHash.length).toBeGreaterThan(20); // bcrypt hash is long
    });

    it("should create company and owner membership", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          companyName: "Purple Tech",
          email: "owner@example.com",
          password: "password123",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const { drizzle: testDrizzle } = getTestDb();
      const [company] = await testDrizzle
        .select()
        .from(companies)
        .where(eq(companies.name, "Purple Tech"))
        .limit(1);
      expect(company).toBeDefined();

      const [user] = await testDrizzle
        .select()
        .from(users)
        .where(eq(users.email, "owner@example.com"))
        .limit(1);
      expect(user).toBeDefined();

      const [membership] = await testDrizzle
        .select()
        .from(companyMembers)
        .where(eq(companyMembers.userId, user!.id))
        .limit(1);
      expect(membership).toBeDefined();
      expect(membership?.companyId).toBe(company?.id);
      expect(membership?.role).toBe("owner");
      expect(membership?.status).toBe("active");
    });

    it("should handle invalid JSON gracefully", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: "invalid json",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });
});
