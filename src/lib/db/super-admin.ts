import { sqlite } from "@/db/client";
import { superAdminUsers } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function isSuperAdminUser(userId: number): Promise<boolean> {
  try {
    const [row] = await sqlite
      .select({ userId: superAdminUsers.userId })
      .from(superAdminUsers)
      .where(eq(superAdminUsers.userId, userId))
      .limit(1);

    return !!row;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("no such table: super_admin_users")) {
      return false;
    }
    throw error;
  }
}

export async function grantSuperAdmin(userId: number): Promise<void> {
  await sqlite
    .insert(superAdminUsers)
    .values({ userId })
    .onConflictDoNothing({
      target: superAdminUsers.userId,
    });
}
