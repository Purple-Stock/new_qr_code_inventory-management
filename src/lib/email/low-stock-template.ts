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
<div style="margin:0;padding:0;background:#f4f2ff;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f2ff;margin:0;padding:0;width:100%;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;width:100%;">
          <tr>
            <td style="padding:0 0 18px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="left">
                    <span style="display:inline-block;padding:10px 16px;border-radius:999px;background:#efe9ff;border:1px solid #dccfff;color:#5b3df5;font-family:Poppins,Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">
                      Purple Stock
                    </span>
                  </td>
                  <td align="right" style="font-family:Poppins,Arial,sans-serif;font-size:13px;color:#6f6787;">
                    Alerta de estoque
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="border-radius:28px;background:#ffffff;border:1px solid #e6dcff;padding:36px 32px 28px;box-shadow:0 24px 60px rgba(88,63,180,0.10);">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding:0 0 18px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width:56px;height:56px;border-radius:18px;background:#5b3df5;text-align:center;line-height:56px;font-family:Poppins,Arial,sans-serif;font-size:20px;font-weight:700;color:#ffffff;">
                          PS
                        </td>
                        <td style="padding-left:14px;font-family:Poppins,Arial,sans-serif;">
                          <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:#fff7ed;border:1px solid #fed7aa;color:#c2410c;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">
                            Estoque baixo
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.1;font-weight:700;color:#131a2d;letter-spacing:-0.03em;">
                    ${safeName}
                  </td>
                </tr>
                ${
                  safeSku
                    ? `<tr>
                  <td style="padding:0 0 20px;font-family:Poppins,Arial,sans-serif;font-size:14px;color:#6f6787;">
                    SKU ${safeSku}
                  </td>
                </tr>`
                    : `<tr><td style="padding:0 0 20px;"></td></tr>`
                }
                <tr>
                  <td style="padding:0 0 22px;font-family:Poppins,Arial,sans-serif;font-size:16px;line-height:1.7;color:#4f566b;">
                    O item chegou a <strong style="color:#131a2d;">${current} ${unitLabel}</strong>. Hora de repor antes de faltar na operação.
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="50%" valign="top" style="padding-right:8px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:18px;">
                            <tr>
                              <td style="padding:18px 16px;font-family:Poppins,Arial,sans-serif;">
                                <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#c2410c;padding-bottom:6px;">Estoque atual</div>
                                <div style="font-size:28px;line-height:1;font-weight:700;color:#9a3412;">${current}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td width="50%" valign="top" style="padding-left:8px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f6f2ff;border:1px solid #e7dcff;border-radius:18px;">
                            <tr>
                              <td style="padding:18px 16px;font-family:Poppins,Arial,sans-serif;">
                                <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#7258d5;padding-bottom:6px;">Mínimo</div>
                                <div style="font-size:28px;line-height:1;font-weight:700;color:#5b3df5;">${minimum}</div>
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
                    <a href="${safeCtaUrl}" style="display:inline-block;padding:15px 22px;border-radius:14px;background:#5b3df5;color:#ffffff;text-decoration:none;font-family:Poppins,Arial,sans-serif;font-size:15px;font-weight:700;">
                      Repor estoque
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 8px 0;font-family:Poppins,Arial,sans-serif;font-size:12px;line-height:1.7;color:#7a7392;text-align:center;">
              Purple Stock • ${year}<br />
              Controle de estoque com QR Code.<br />
              <a href="https://www.purplestock.com.br" style="color:#5b3df5;text-decoration:none;font-weight:700;">www.purplestock.com.br</a>
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
