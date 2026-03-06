import { sqlite } from "@/db/client";
import { companies, companyMembers, users } from "@/db/schema";
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

function slugifyCompanyName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

async function buildUniqueCompanySlug(
  tx: Parameters<Parameters<typeof sqlite.transaction>[0]>[0],
  companyName: string
): Promise<string> {
  const baseSlug = slugifyCompanyName(companyName) || "company";

  for (let suffix = 0; suffix < 1000; suffix += 1) {
    const candidate = suffix === 0 ? baseSlug : `${baseSlug}-${suffix}`;
    const [existing] = await tx
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.slug, candidate))
      .limit(1);

    if (!existing) {
      return candidate;
    }
  }

  return `${baseSlug}-${Date.now()}`;
}

function inferLegacyCompanyName(email: string | null | undefined, userId: number): string {
  if (!email) {
    return `Empresa ${userId}`;
  }

  const localPart = email.split("@")[0]?.trim();
  if (!localPart) {
    return `Empresa ${userId}`;
  }

  return `${localPart} Company`;
}

export async function ensureActiveCompanyForUser(userId: number): Promise<number> {
  return sqlite.transaction(async (tx) => {
    const [membership] = await tx
      .select({ companyId: companyMembers.companyId })
      .from(companyMembers)
      .where(
        and(
          eq(companyMembers.userId, userId),
          eq(companyMembers.status, "active")
        )
      )
      .limit(1);

    if (membership?.companyId) {
      return membership.companyId;
    }

    const [user] = await tx
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const companyName = inferLegacyCompanyName(user?.email, userId);
    const slug = await buildUniqueCompanySlug(tx, companyName);

    const [company] = await tx
      .insert(companies)
      .values({
        name: companyName,
        slug,
      })
      .returning();

    await tx.insert(companyMembers).values({
      companyId: company.id,
      userId,
      role: "owner",
      status: "active",
    });

    return company.id;
  });
}
