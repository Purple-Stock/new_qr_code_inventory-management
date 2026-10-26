import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserIdFromSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

export async function requirePageUserId(): Promise<number> {
  const userId = getUserIdFromSessionToken(
    (await cookies()).get(SESSION_COOKIE_NAME)?.value
  );
  if (!userId) {
    redirect("/");
  }
  return userId;
}
