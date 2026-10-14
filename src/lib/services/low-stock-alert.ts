import { getTeamMembersWithUsers } from "@/lib/db/team-members";
import { sendResendEmail } from "@/lib/email/resend";
import { crossedMinimumStockThreshold } from "@/lib/item-minimum-stock";

function escapeHtml(value: string): string {
  return value
    .split("&")
    .join("&amp;")
    .split("<")
    .join("&lt;")
    .split(">")
    .join("&gt;")
    .split('"')
    .join("&quot;")
    .split("'")
    .join("&#39;");
}

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

function buildLowStockCopy(params: {
  itemName: string | null | undefined;
  itemSku?: string | null;
  nextStock: number;
  minimumStock: number;
}): { itemName: string; subject: string; html: string; text: string } {
  const itemName = params.itemName?.trim() || "Item sem nome";
  const skuSuffix = params.itemSku?.trim()
    ? ` (SKU ${params.itemSku.trim()})`
    : "";
  const unitLabel = params.nextStock === 1 ? "unidade" : "unidades";
  const text = [
    `O item ${itemName}${skuSuffix} chegou a ${params.nextStock} ${unitLabel}.`,
    `O estoque mínimo configurado é ${params.minimumStock}.`,
    "Acesse o Purple Stock para repor o estoque.",
  ].join("\n");
  const html = [
    `<p>O item <strong>${escapeHtml(itemName)}</strong>${escapeHtml(skuSuffix)} chegou a <strong>${params.nextStock}</strong> ${unitLabel}.</p>`,
    `<p>O estoque mínimo configurado é <strong>${params.minimumStock}</strong>.</p>`,
    "<p>Acesse o Purple Stock para repor o estoque.</p>",
  ].join("");

  return {
    itemName,
    subject: `Estoque baixo: ${itemName}`,
    html,
    text,
  };
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

  const copy = buildLowStockCopy({
    itemName: params.itemName,
    itemSku: params.itemSku,
    nextStock: params.nextStock,
    minimumStock: params.minimumStock ?? 0,
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
