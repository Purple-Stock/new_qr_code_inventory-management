import { buildNewUserSignupEmail } from "@/lib/email/new-user-signup-template";
import type { NewUserSignupSource } from "@/lib/email/new-user-signup-template";
import { sendResendEmail } from "@/lib/email/resend";

export const DEFAULT_NEW_USER_NOTIFY_EMAIL = "matheus.puppe@gmail.com";

function resolveNotifyEmail(): string | null {
  const configured = process.env.NEW_USER_NOTIFY_EMAIL?.trim();
  if (configured) {
    return configured;
  }
  return DEFAULT_NEW_USER_NOTIFY_EMAIL;
}

export async function notifyNewUserRegistered(params: {
  email: string;
  phone?: string | null;
  companyName?: string | null;
  source: NewUserSignupSource;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const to = resolveNotifyEmail();
  if (!apiKey || !from || !to) {
    return;
  }

  const copy = buildNewUserSignupEmail({
    email: params.email,
    phone: params.phone,
    companyName: params.companyName,
    source: params.source,
    appUrl: process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL,
  });

  try {
    await sendResendEmail({
      apiKey,
      from,
      to,
      subject: copy.subject,
      html: copy.html,
      text: copy.text,
    });
  } catch (error) {
    console.error("Failed to send new-user signup alert", {
      email: params.email,
      source: params.source,
      error,
    });
  }
}
