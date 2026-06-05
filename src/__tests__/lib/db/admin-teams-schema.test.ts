import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { teams, users } from "@/db/schema";
import { getAdminTeamsWithStats } from "@/lib/db/admin";
import { cleanupTestDb, clearTestDb, getTestDb } from "../../helpers/test-db";

const REQUIRED_TEAM_COLUMNS = [
  "billing_plan_key",
  "stripe_price_id",
  "stripe_subscription_status",
  "manual_trial_ends_at",
] as const;

describe("admin teams schema/query", () => {
  it("does not bundle database client through instrumentation hook", () => {
    const instrumentationPath = path.resolve(process.cwd(), "src/instrumentation.ts");
    expect(fs.existsSync(instrumentationPath)).toBe(false);
  });
  afterEach(async () => {
    await clearTestDb();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  it("keeps teams table columns in sync with drizzle schema", async () => {
    const { db } = getTestDb();
    const result = await db.execute("PRAGMA table_info(teams)");
    const columnNames = new Set(result.rows.map((row) => String(row.name)));

    for (const columnName of REQUIRED_TEAM_COLUMNS) {
      expect(columnNames.has(columnName)).toBe(true);
    }

    expect(columnNames.has(teams.billingPlanKey.name)).toBe(true);
  });

  it("loads admin teams without failing when billing_plan_key exists", async () => {
    const { drizzle } = getTestDb();
    const [user] = await drizzle
      .insert(users)
      .values({ email: "schema-check@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [owner] = await drizzle
      .insert(teams)
      .values({
        name: "Schema Check Team",
        userId: user.id,
        billingPlanKey: "promo_90d_120",
      })
      .returning();

    expect(owner.billingPlanKey).toBe("promo_90d_120");

    const result = await getAdminTeamsWithStats({
      page: 1,
      pageSize: 10,
      search: "Schema Check",
    });

    expect(result.total).toBe(1);
    expect(result.teams[0]?.billingPlanKey).toBe("promo_90d_120");
    expect(result.teams[0]?.name).toBe("Schema Check Team");
  });
});
