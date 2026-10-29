import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import {
  WELCOME_CALENDLY_URL,
  WELCOME_WHATSAPP_URL,
  buildWelcomeEmail,
} from "@/lib/email/welcome-template";

faker.seed(20261029);

describe("buildWelcomeEmail", () => {
  it("includes WhatsApp and Calendly links in a Purple Stock branded welcome", () => {
    const companyName = faker.company.name();

    const copy = buildWelcomeEmail({
      companyName,
      appUrl: "https://app.purplestock.com.br",
    });

    expect(WELCOME_WHATSAPP_URL).toBe("https://wa.me/5511995597242");
    expect(WELCOME_CALENDLY_URL).toBe(
      "https://calendly.com/matheus-puppe/purple-stock"
    );
    expect(copy.subject).toBe("Bem-vindo ao Purple Stock");
    expect(copy.text).toContain(companyName);
    expect(copy.text).toContain(WELCOME_WHATSAPP_URL);
    expect(copy.text).toContain(WELCOME_CALENDLY_URL);
    expect(copy.text).toContain("https://app.purplestock.com.br");
    expect(copy.html).toContain('role="presentation"');
    expect(copy.html).toContain("Purple Stock");
    expect(copy.html).toContain("#6B21A8");
    expect(copy.html).toContain(companyName);
    expect(copy.html).toContain(WELCOME_WHATSAPP_URL);
    expect(copy.html).toContain(WELCOME_CALENDLY_URL);
    expect(copy.html).toContain("Falar no WhatsApp");
    expect(copy.html).toContain("Agendar 15 min");
  });

  it("escapes company names in HTML", () => {
    const copy = buildWelcomeEmail({
      companyName: 'Loja <script>alert(1)</script>',
    });

    expect(copy.html).toContain("Loja &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(copy.html).not.toContain("<script>");
    expect(copy.text).toContain('Loja <script>alert(1)</script>');
  });
});
