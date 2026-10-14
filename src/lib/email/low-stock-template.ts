/** App brand tokens from login, signup, and TeamLayout (`#6B21A8` / `#7C3AED` / purple-50). */
const BRAND = "#6B21A8";
const BRAND_ACCENT = "#7C3AED";
const CANVAS = "#faf5ff";
const WASH = "#f3e8ff";
const LINE = "#e9d5ff";
const INK = "#111827";
const MUTED = "#4b5563";

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

function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

export function resolveAppUrl(raw?: string | null): string {
  const trimmed = raw?.trim();
  if (trimmed) {
    return trimmed.replace(/\/+$/, "");
  }
  return "https://app.purplestock.com.br";
}

export function buildLowStockEmail(params: {
  itemName: string | null | undefined;
  itemSku?: string | null;
  nextStock: number;
  minimumStock: number;
  teamId: number;
  appUrl?: string | null;
}): { itemName: string; subject: string; html: string; text: string } {
  const itemName = params.itemName?.trim() || "Item sem nome";
  const sku = params.itemSku?.trim() || "";
  const skuSuffix = sku ? ` (SKU ${sku})` : "";
  const unitLabel = params.nextStock === 1 ? "unidade" : "unidades";
  const current = formatQuantity(params.nextStock);
  const minimum = formatQuantity(params.minimumStock);
  const appUrl = resolveAppUrl(params.appUrl);
  const ctaUrl = `${appUrl}/teams/${params.teamId}/stock-in`;
  const year = new Date().getFullYear();

  const text = [
    `O item ${itemName}${skuSuffix} chegou a ${current} ${unitLabel}.`,
    `O estoque mínimo configurado é ${minimum}.`,
    "Acesse o Purple Stock para repor o estoque.",
    ctaUrl,
  ].join("\n");

  const safeName = escapeHtml(itemName);
  const safeSku = sku ? escapeHtml(sku) : "";
  const safeCtaUrl = escapeHtml(ctaUrl);

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
                    Alerta de estoque
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="border-radius:24px;background:#ffffff;border:1px solid ${LINE};padding:36px 32px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding:0 0 18px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td bgcolor="${BRAND}" style="width:56px;height:56px;border-radius:16px;background:${BRAND};text-align:center;line-height:56px;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:#ffffff;">
                          PS
                        </td>
                        <td style="padding-left:14px;font-family:Arial,Helvetica,sans-serif;">
                          <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:#fef9c3;border:1px solid #fde047;color:#a16207;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">
                            Estoque baixo
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:1.15;font-weight:700;color:${BRAND};letter-spacing:-0.02em;">
                    ${safeName}
                  </td>
                </tr>
                ${
                  safeSku
                    ? `<tr>
                  <td style="padding:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${MUTED};">
                    SKU ${safeSku}
                  </td>
                </tr>`
                    : `<tr><td style="padding:0 0 20px;"></td></tr>`
                }
                <tr>
                  <td style="padding:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.7;color:${MUTED};">
                    O item chegou a <strong style="color:${INK};">${current} ${unitLabel}</strong>. Hora de repor antes de faltar na operação.
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="50%" valign="top" style="padding-right:8px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fef9c3;border:1px solid #fde047;border-radius:16px;">
                            <tr>
                              <td style="padding:18px 16px;font-family:Arial,Helvetica,sans-serif;">
                                <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#a16207;padding-bottom:6px;">Estoque atual</div>
                                <div style="font-size:28px;line-height:1;font-weight:700;color:#a16207;">${current}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td width="50%" valign="top" style="padding-left:8px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${WASH};border:1px solid ${LINE};border-radius:16px;">
                            <tr>
                              <td style="padding:18px 16px;font-family:Arial,Helvetica,sans-serif;">
                                <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND};padding-bottom:6px;">Mínimo</div>
                                <div style="font-size:28px;line-height:1;font-weight:700;color:${BRAND_ACCENT};">${minimum}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 8px;">
                    <a href="${safeCtaUrl}" style="display:inline-block;padding:14px 22px;border-radius:8px;background:${BRAND};color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;">
                      Repor estoque
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
              <a href="https://www.purplestock.com.br" style="color:${BRAND};text-decoration:none;font-weight:700;">www.purplestock.com.br</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
  `.trim();

  return {
    itemName,
    subject: `Estoque baixo: ${itemName}`,
    html,
    text,
  };
}
