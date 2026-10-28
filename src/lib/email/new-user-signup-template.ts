/** App brand tokens from login, signup, and TeamLayout (`#6B21A8` / `#7C3AED` / purple-50). */
const BRAND = "#6B21A8";
const BRAND_ACCENT = "#7C3AED";
const CANVAS = "#faf5ff";
const WASH = "#f3e8ff";
const LINE = "#e9d5ff";
const INK = "#111827";
const MUTED = "#4b5563";

export type NewUserSignupSource = "signup" | "team_member" | "super_admin";

const SOURCE_LABEL: Record<NewUserSignupSource, string> = {
  signup: "Cadastro público",
  team_member: "Usuário criado na equipe",
  super_admin: "Criado pelo super admin",
};

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

function displayOrDash(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

export function buildNewUserSignupEmail(params: {
  email: string;
  phone?: string | null;
  companyName?: string | null;
  source: NewUserSignupSource;
  appUrl?: string | null;
}): { subject: string; html: string; text: string } {
  const email = params.email.trim();
  const phone = displayOrDash(params.phone);
  const companyName = displayOrDash(params.companyName);
  const sourceLabel = SOURCE_LABEL[params.source];
  const appUrl = resolveAppUrl(params.appUrl);
  const year = new Date().getFullYear();

  const text = [
    "Novo usuário cadastrado no Purple Stock.",
    `E-mail: ${email}`,
    `Telefone: ${phone}`,
    `Empresa: ${companyName}`,
    `Origem: ${sourceLabel}`,
    appUrl,
  ].join("\n");

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
                    Novo cadastro
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
                    Novo usuário cadastrado
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.7;color:${MUTED};">
                    Alguém acabou de criar uma conta. Seguem os dados para você acompanhar.
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${MUTED};">
                    <strong style="color:${INK};">E-mail:</strong> ${escapeHtml(email)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${MUTED};">
                    <strong style="color:${INK};">Telefone:</strong> ${escapeHtml(phone)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${MUTED};">
                    <strong style="color:${INK};">Empresa:</strong> ${escapeHtml(companyName)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${MUTED};">
                    <strong style="color:${INK};">Origem:</strong> ${escapeHtml(sourceLabel)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 8px;">
                    <a href="${escapeHtml(appUrl)}" style="display:inline-block;padding:14px 22px;border-radius:8px;background:${BRAND};color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;">
                      Abrir o app
                    </a>
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
    subject: `Novo cadastro no Purple Stock: ${email}`,
    html,
    text,
  };
}
