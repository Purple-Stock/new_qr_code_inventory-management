import { chromium } from "@playwright/test";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = join(import.meta.dirname, "..");
const html = pathToFileURL(join(root, "scripts/og-card.html")).href;
const out = join(root, "public/og-image.png");

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
await page.goto(html, { waitUntil: "networkidle" });
await page.screenshot({ path: out, type: "png" });
await browser.close();
console.log(`wrote ${out}`);
