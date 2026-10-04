import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const deploy = JSON.parse(
  readFileSync(join(root, ".cleat_deploy/deploy.json"), "utf8")
) as { build_command?: string };

const bashKeywords = new Set([
  "if",
  "then",
  "else",
  "elif",
  "fi",
  "export",
  "set",
]);

describe("cleat deploy.json build_command", () => {
  it("starts with an executable so cleat_cpu_limit can wrap it", () => {
    const command = deploy.build_command ?? "";
    const first = command.trim().split(/\s+/)[0] ?? "";
    expect(first.length).toBeGreaterThan(0);
    expect(first).not.toMatch(/=/);
    expect(bashKeywords.has(first)).toBe(false);
  });

  it("runs the committed build script instead of inlining if/then", () => {
    expect(deploy.build_command).toMatch(
      /^bash(?:\s+--norc)?\s+\.cleat_deploy\/build\.sh$/
    );
    expect(existsSync(join(root, ".cleat_deploy/build.sh"))).toBe(true);
  });
});

describe("cleat build.sh", () => {
  it("runs npm run build and does not skip a Next compile", () => {
    const script = readFileSync(join(root, ".cleat_deploy/build.sh"), "utf8");
    expect(script).toContain("npm run build");
    expect(script).not.toMatch(/skipping next build/i);
  });

  it("treats DATABASE_PATH as enough to compile", () => {
    const script = readFileSync(join(root, ".cleat_deploy/build.sh"), "utf8");
    expect(script).toMatch(/DATABASE_PATH/);
    expect(script).toMatch(/DATABASE_URL/);
  });
});
