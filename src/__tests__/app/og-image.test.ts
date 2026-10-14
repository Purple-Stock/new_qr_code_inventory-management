import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function pngSize(buffer: Buffer) {
  expect(buffer.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

describe("app OG preview image", () => {
  it("is a 1200x630 PNG committed at public/og-image.png", () => {
    const imagePath = join(root, "public/og-image.png");
    expect(existsSync(imagePath)).toBe(true);
    const { width, height } = pngSize(readFileSync(imagePath));
    expect(width).toBe(1200);
    expect(height).toBe(630);
  });

  it("is generated from an app-exclusive card, not the marketing landing", () => {
    const html = readFileSync(join(root, "scripts/og-card.html"), "utf8").replace(
      /<br\s*\/?>/g,
      " "
    );
    expect(html).toContain("app.purplestock.com.br");
    expect(html).toContain("Seu inventário simplificado");
    expect(html).toMatch(/>APP</);
    expect(html).not.toContain(
      "Controle de estoque com QR Code no celular e no almoxarifado"
    );
  });
});
