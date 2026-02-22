import { sqlite } from "@/db/client";
import { companies, companyMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function getActiveCompanyIdForUser(userId: number): Promise<number | null> {
  const [membership] = await sqlite
    .select({ companyId: companyMembers.companyId })
    .from(companyMembers)
    .where(
      and(
        eq(companyMembers.userId, userId),
        eq(companyMembers.status, "active")
      )
    )
    .limit(1);

  return membership?.companyId ?? null;
}

export async function updateCompanyName(companyId: number, name: string) {
  const [updated] = await sqlite
    .update(companies)
    .set({
      name,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId))
    .returning();

  if (!updated) {
    throw new Error("Company not found");
  }

  return updated;
}
