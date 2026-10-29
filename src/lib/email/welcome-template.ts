/** App brand tokens from login, signup, and TeamLayout (`#6B21A8` / `#7C3AED` / purple-50). */
const BRAND = "#6B21A8";
const BRAND_ACCENT = "#7C3AED";
const CANVAS = "#faf5ff";
const WASH = "#f3e8ff";
const LINE = "#e9d5ff";
const INK = "#111827";
const MUTED = "#4b5563";

export const WELCOME_WHATSAPP_URL = "https://wa.me/5511995597242";
export const WELCOME_CALENDLY_URL =
  "https://calendly.com/matheus-puppe/purple-stock";

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

function resolveAppUrl(raw?: string | null): string {
  const trimmed = raw?.trim();
  if (trimmed) {
    return trimmed.replace(/\/+$/, "");
  }
  return "https://app.purplestock.com.br";
}

export function buildWelcomeEmail(params: {
  companyName?: string | null;
  appUrl?: string | null;
}): { subject: string; html: string; text: string } {
  const companyName = params.companyName?.trim() || "";
  const appUrl = resolveAppUrl(params.appUrl);
  const year = new Date().getFullYear();
  const intro = companyName
    ? `Sua conta da ${companyName} está pronta.`
    : "Sua conta está pronta.";

  const text = [
    companyName
      ? `Bem-vindo ao Purple Stock, ${companyName}.`
      : "Bem-vindo ao Purple Stock.",
    intro,
    "Se quiser uma mão para começar, me chama no WhatsApp ou marca 15 minutos na agenda.",
    `WhatsApp: ${WELCOME_WHATSAPP_URL}`,
    `Agendar conversa: ${WELCOME_CALENDLY_URL}`,
    `Abrir o app: ${appUrl}`,
  ].join("\n");

  const safeCompany = escapeHtml(companyName);
  const safeIntro = companyName
    ? `Sua conta da <strong style="color:${INK};">${safeCompany}</strong> está pronta.`
    : "Sua conta está pronta.";
  const safeWhatsapp = escapeHtml(WELCOME_WHATSAPP_URL);
  const safeCalendly = escapeHtml(WELCOME_CALENDLY_URL);
  const safeAppUrl = escapeHtml(appUrl);

  const html = `
<div style="margin:0;padding:0;background:${CANVAS};">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${CANVAS}" style="background:${CANVAS};margin:0;padding:0;width:100%;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;width:100%;">
          <tr>
            <td style="padding:0 0 18px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="left">
                    <span style="display:inline-block;padding:10px 16px;border-radius:999px;background:${WASH};border:1px solid ${LINE};color:${BRAND};font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">
                      Purple Stock
                    </span>
                  </td>
                  <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${MUTED};">
                    Boas-vindas
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="border-radius:24px;background:#ffffff;border:1px solid ${LINE};padding:36px 32px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:1.15;font-weight:700;color:${BRAND};letter-spacing:-0.02em;">
                    Bem-vindo ao Purple Stock
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.7;color:${MUTED};">
                    ${safeIntro} Se quiser uma mão para começar, me chama no WhatsApp ou marca 15 minutos na agenda.
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 12px;">
                    <a href="${safeWhatsapp}" style="display:inline-block;padding:14px 22px;border-radius:8px;background:${BRAND};color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;">
                      Falar no WhatsApp
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 24px;">
                    <a href="${safeCalendly}" style="display:inline-block;padding:14px 22px;border-radius:8px;background:${BRAND_ACCENT};color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;">
                      Agendar 15 min
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:${MUTED};">
                    WhatsApp: <a href="${safeWhatsapp}" style="color:${BRAND};text-decoration:none;font-weight:700;">${safeWhatsapp}</a><br />
                    Agenda: <a href="${safeCalendly}" style="color:${BRAND};text-decoration:none;font-weight:700;">${safeCalendly}</a><br />
                    App: <a href="${safeAppUrl}" style="color:${BRAND};text-decoration:none;font-weight:700;">${safeAppUrl}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:${MUTED};text-align:center;">
              Purple Stock • ${year}<br />
              Controle de estoque com QR Code.<br />
              <a href="https://www.purplestock.com.br" style="color:${BRAND_ACCENT};text-decoration:none;font-weight:700;">www.purplestock.com.br</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
  `.trim();

  return {
    subject: "Bem-vindo ao Purple Stock",
    html,
    text,
  };
}
