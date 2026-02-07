import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";

const CHECK_SCRIPT_PATH = path.join(process.cwd(), "scripts/check-architecture.mjs");

function createTempProject(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "arch-check-"));
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(dir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf8");
  }
  return dir;
}

function runCheckIn(dir: string): { ok: true; output: string } | { ok: false; output: string } {
  try {
    const output = execFileSync("node", [CHECK_SCRIPT_PATH], {
      cwd: dir,
      encoding: "utf8",
      stdio: "pipe",
    });
    return { ok: true, output };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string };
    return { ok: false, output: `${err.stdout ?? ""}\n${err.stderr ?? ""}` };
  }
}

describe("scripts/check-architecture.mjs", () => {
  it("passes on a compliant fixture", () => {
    const dir = createTempProject({
      "src/lib/services/example.ts": "export const ok = true;\n",
      "src/app/api/example/route.ts":
        'import { successResponse } from "@/lib/api-route";\nexport function GET(){return successResponse({ ok: true });}\n',
      "src/components/Widget.tsx": "export function Widget(){ return null; }\n",
    });

    const result = runCheckIn(dir);
    expect(result.ok).toBe(true);
    expect(result.output).toContain("Architecture check passed.");
  });

  it("fails Rule 1 when UI imports db directly", () => {
    const dir = createTempProject({
      "src/app/page.tsx": 'import { x } from "@/lib/db/users";\nexport default function Page(){return null;}\n',
    });
    const result = runCheckIn(dir);
    expect(result.ok).toBe(false);
    expect(result.output).toContain("Rule 1");
  });

  it("fails Rule 2 when API imports db directly", () => {
    const dir = createTempProject({
      "src/app/api/test/route.ts":
        'import { x } from "@/lib/db/users";\nexport function GET(){ return null as never; }\n',
    });
    const result = runCheckIn(dir);
    expect(result.ok).toBe(false);
    expect(result.output).toContain("Rule 2");
  });

  it("fails Rule 3 when explicit any appears in services/api", () => {
    const dir = createTempProject({
      "src/lib/services/test.ts": "export function bad(v: any){ return v; }\n",
    });
    const result = runCheckIn(dir);
    expect(result.ok).toBe(false);
    expect(result.output).toContain("Rule 3");
  });

  it("fails Rule 4 when errorResponse is called with 2 args", () => {
    const dir = createTempProject({
      "src/app/api/test/route.ts":
        'import { errorResponse } from "@/lib/api-route";\nexport function GET(){ return errorResponse("bad", 400); }\n',
    });
    const result = runCheckIn(dir);
    expect(result.ok).toBe(false);
    expect(result.output).toContain("Rule 4");
  });

  it("fails Rule 5 when NextResponse.json is used directly", () => {
    const dir = createTempProject({
      "src/app/api/test/route.ts":
        'import { NextResponse } from "next/server";\nexport function GET(){ return NextResponse.json({ ok: true }); }\n',
    });
    const result = runCheckIn(dir);
    expect(result.ok).toBe(false);
    expect(result.output).toContain("Rule 5");
  });

  it("fails Rule 6 when internalErrorResponse is used in API route", () => {
    const dir = createTempProject({
      "src/app/api/test/route.ts":
        'import { internalErrorResponse } from "@/lib/api-route";\nexport function GET(){ return internalErrorResponse("boom"); }\n',
    });
    const result = runCheckIn(dir);
    expect(result.ok).toBe(false);
    expect(result.output).toContain("Rule 6");
  });

  it("fails Rule 7 when API imports contracts schemas", () => {
    const dir = createTempProject({
      "src/app/api/test/route.ts":
        'import { parseLoginPayload } from "@/lib/contracts/schemas";\nexport function GET(){ return parseLoginPayload({}); }\n',
    });
    const result = runCheckIn(dir);
    expect(result.ok).toBe(false);
    expect(result.output).toContain("Rule 7");
  });

  it("fails Rule 8 when API calls parse*Payload", () => {
    const dir = createTempProject({
      "src/app/api/test/route.ts":
        "function parseSomethingPayload(v: unknown){ return v; }\nexport function POST(){ return parseSomethingPayload({}); }\n",
    });
    const result = runCheckIn(dir);
    expect(result.ok).toBe(false);
    expect(result.output).toContain("Rule 8");
  });

  it("fails Rule 9 when API builds manual HTTP response", () => {
    const dir = createTempProject({
      "src/app/api/test/route.ts":
        'export function GET(){ return Response.json({ ok: true }); }\n',
    });
    const result = runCheckIn(dir);
    expect(result.ok).toBe(false);
    expect(result.output).toContain("Rule 9");
  });
});
