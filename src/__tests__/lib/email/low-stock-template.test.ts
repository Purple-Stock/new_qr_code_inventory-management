import { describe, expect, it } from "vitest";
import { buildLowStockEmail } from "@/lib/email/low-stock-template";

describe("buildLowStockEmail", () => {
  it("renders a Purple Stock branded table with stock vs minimum and a restock CTA", () => {
    const email = buildLowStockEmail({
      itemName: "Cabo HDMI",
      itemSku: "HDMI-1",
      nextStock: 1,
      minimumStock: 2,
      teamId: 10,
      appUrl: "https://app.purplestock.com.br",
    });

    expect(email.subject).toBe("Estoque baixo: Cabo HDMI");
    expect(email.text).toContain("Cabo HDMI (SKU HDMI-1)");
    expect(email.text).toContain("1 unidade");
    expect(email.text).toContain("2");
    expect(email.html).toContain('role="presentation"');
    expect(email.html).toContain("Purple Stock");
    expect(email.html).toContain("#5b3df5");
    expect(email.html).toContain("Cabo HDMI");
    expect(email.html).toContain("HDMI-1");
    expect(email.html).toContain("Repor estoque");
    expect(email.html).toContain(
      "https://app.purplestock.com.br/teams/10/stock-in"
    );
    expect(email.html).toContain("Estoque atual");
    expect(email.html).toContain("Mínimo");
  });

  it("escapes item names in HTML", () => {
    const email = buildLowStockEmail({
      itemName: "Cabo <script>alert(1)</script>",
      itemSku: 'HDMI-"1"',
      nextStock: 1,
      minimumStock: 2,
      teamId: 10,
      appUrl: "https://app.purplestock.com.br",
    });

    expect(email.html).toContain(
      "Cabo &lt;script&gt;alert(1)&lt;/script&gt;"
    );
    expect(email.html).toContain("HDMI-&quot;1&quot;");
    expect(email.html).not.toContain("<script>");
    expect(email.text).toContain("Cabo <script>alert(1)</script>");
  });
});
