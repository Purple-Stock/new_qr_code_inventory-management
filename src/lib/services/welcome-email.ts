import { buildWelcomeEmail } from "@/lib/email/welcome-template";
import { sendResendEmail } from "@/lib/email/resend";

export async function sendSignupWelcomeEmail(params: {
  email: string;
  companyName?: string | null;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const to = params.email.trim();
  if (!apiKey || !from || !to) {
    return;
  }

  const copy = buildWelcomeEmail({
    companyName: params.companyName,
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
    console.error("Failed to send signup welcome email", {
      email: params.email,
      error,
    });
  }
}
