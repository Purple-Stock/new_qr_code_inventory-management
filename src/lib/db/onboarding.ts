import { sqlite } from "@/db/client";
import { companies, companyMembers, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";

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

export async function onboardCompanyOwner(data: {
  email: string;
  password: string;
  companyName: string;
}) {
  const passwordHash = await hashPassword(data.password);

  return sqlite.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        email: data.email,
        passwordHash,
        role: "admin",
      })
      .returning();

    const slug = await buildUniqueCompanySlug(tx, data.companyName);

    const [company] = await tx
      .insert(companies)
      .values({
        name: data.companyName,
        slug,
      })
      .returning();

    await tx.insert(companyMembers).values({
      companyId: company.id,
      userId: user.id,
      role: "owner",
      status: "active",
    });

    return { user, company };
  });
}

