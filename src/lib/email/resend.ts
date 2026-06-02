type SendResendEmailParams = {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
};

type ResendSendResponse = {
  id?: string;
  message?: string;
  name?: string;
};

export async function sendResendEmail(params: SendResendEmailParams): Promise<string> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      from: params.from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  const payload = (await response.json().catch(() => null)) as ResendSendResponse | null;
  if (!response.ok || !payload?.id) {
    const detail = payload?.message || payload?.name || `HTTP ${response.status}`;
    throw new Error(`Resend send failed: ${detail}`);
  }

  return payload.id;
}
