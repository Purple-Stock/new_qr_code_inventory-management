import { getTeamMembersWithUsers } from "@/lib/db/team-members";
import { buildLowStockEmail } from "@/lib/email/low-stock-template";
import { sendResendEmail } from "@/lib/email/resend";
import { crossedMinimumStockThreshold } from "@/lib/item-minimum-stock";

function uniqueMemberEmails(
  members: Array<{ email: string | null | undefined }>
): string[] {
  const emails: string[] = [];
  const seen = new Set<string>();

  for (const member of members) {
    const email = member.email?.trim();
    if (!email) {
      continue;
    }
    const key = email.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    emails.push(email);
  }

  return emails;
}

export async function notifyIfMinimumStockCrossed(params: {
  teamId: number;
  itemName: string | null | undefined;
  itemSku?: string | null;
  previousStock: number;
  nextStock: number;
  minimumStock: number | null | undefined;
}): Promise<void> {
  if (
    !crossedMinimumStockThreshold({
      previousStock: params.previousStock,
      nextStock: params.nextStock,
      minimumStock: params.minimumStock,
    })
  ) {
    return;
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    return;
  }

  const copy = buildLowStockEmail({
    itemName: params.itemName,
    itemSku: params.itemSku,
    nextStock: params.nextStock,
    minimumStock: params.minimumStock ?? 0,
    teamId: params.teamId,
    appUrl: process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL,
  });

  try {
    const members = await getTeamMembersWithUsers(params.teamId);
    const emails = uniqueMemberEmails(members);
    await Promise.allSettled(
      emails.map((to) =>
        sendResendEmail({
          apiKey,
          from,
          to,
          subject: copy.subject,
          html: copy.html,
          text: copy.text,
        })
      )
    );
  } catch (error) {
    console.error("Failed to send low-stock alert", {
      teamId: params.teamId,
      error,
    });
  }
}
