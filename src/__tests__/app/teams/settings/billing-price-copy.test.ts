import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const settingsSource = readFileSync(
  join(
    process.cwd(),
    "src/app/teams/[id]/settings/_components/SettingsPageClient.tsx"
  ),
  "utf8"
);

describe("team billing price copy", () => {
  it("advertises R$ 99 per team on the settings billing card", () => {
    expect(settingsSource).toContain("Plano Pro: R$ 99 por time/mês.");
  });
});
