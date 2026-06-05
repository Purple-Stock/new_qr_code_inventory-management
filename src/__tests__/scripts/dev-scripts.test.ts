import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("dev scripts", () => {
  it("uses NEXT_DIST_DIR env instead of unsupported --dist-dir CLI flag", () => {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts: Record<string, string>;
    };

    for (const scriptName of ["dev:local-default", "dev:local-prod"] as const) {
      const script = packageJson.scripts[scriptName];
      expect(script).toBeTruthy();
      expect(script).toContain("NEXT_DIST_DIR=");
      expect(script).not.toContain("--dist-dir");
    }
  });
});
