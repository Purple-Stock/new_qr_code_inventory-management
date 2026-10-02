import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
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

  it("loads unquoted PHX_HOST with comma-separated hosts", () => {
    const dir = mkdtempSync(join(tmpdir(), "cleat-env-"));
    try {
      const envFile = join(dir, "env");
      writeFileSync(
        envFile,
        "PHX_HOST=app.purplestock.com.br, app.apps.gestaobem.com\nDATABASE_PATH=/opt/purple.db\n"
      );
      writeFileSync(
        join(dir, "npm"),
        "#!/bin/sh\necho unexpected-npm >&2\nexit 1\n"
      );
      chmodSync(join(dir, "npm"), 0o755);
      const result = execFileSync("bash", [join(root, ".cleat_deploy/build.sh")], {
        encoding: "utf8",
        env: {
          PATH: `${dir}:${process.env.PATH ?? "/usr/bin"}`,
          HOME: dir,
          CLEAT_PANEL_ENV_FILE: envFile,
          CLEAT_BUILD_LOAD_ONLY: "1",
        },
      });
      expect(result).toContain(
        "PHX_HOST=app.purplestock.com.br, app.apps.gestaobem.com"
      );
      expect(result).toContain("DATABASE_URL=file:/opt/purple.db");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
