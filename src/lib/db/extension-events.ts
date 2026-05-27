import { desc, eq } from "drizzle-orm";
import { sqlite } from "@/db/client";
import { extensionEvents } from "@/db/schema";
import type { ExtensionEventName } from "@/db/schema";

export async function createExtensionEvent(data: {
  eventName: ExtensionEventName;
  anonymousId?: string | null;
  source?: string | null;
  userId?: number | null;
  teamId?: number | null;
  metadata?: Record<string, unknown> | null;
}) {
  const [event] = await sqlite
    .insert(extensionEvents)
    .values({
      eventName: data.eventName,
      anonymousId: data.anonymousId ?? null,
      source: data.source?.trim() || "chrome_extension",
      userId: data.userId ?? null,
      teamId: data.teamId ?? null,
      metadata: data.metadata ?? null,
    })
    .returning();

  return event;
}

export async function listExtensionEventsForUser(userId: number) {
  return sqlite
    .select()
    .from(extensionEvents)
    .where(eq(extensionEvents.userId, userId))
    .orderBy(desc(extensionEvents.createdAt));
}
