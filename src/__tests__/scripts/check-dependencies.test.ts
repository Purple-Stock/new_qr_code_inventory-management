import { describe, expect, it } from "vitest";
import {
  collectBlockingVulnerabilities,
  collectDeprecatedPackages,
} from "../../../scripts/check-dependencies.mjs";

describe("collectBlockingVulnerabilities", () => {
  it("blocks findings at or above the configured threshold", () => {
    const report = {
      vulnerabilities: {
        "pkg-low": { severity: "low", via: ["Low issue"], range: "1.0.0" },
        "pkg-moderate": {
          severity: "moderate",
          via: ["Moderate issue"],
          range: "2.0.0",
          fixAvailable: true,
        },
        "pkg-high": { severity: "high", via: ["High issue"], range: "3.0.0" },
      },
    };

    expect(collectBlockingVulnerabilities(report, "moderate", [])).toEqual([
      expect.objectContaining({ name: "pkg-high", severity: "high" }),
      expect.objectContaining({ name: "pkg-moderate", severity: "moderate" }),
    ]);
  });

  const allowedAdvisory = {
    source: 1240992,
    name: "braces",
    dependency: "braces",
    title: "braces vulnerable to stack-exhaustion denial of service",
    url: "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm",
    severity: "high",
  };

  const allowlist = [
    { ghsa: "GHSA-vfj7-8cjw-p6xm", reason: "no patched release yet" },
  ];

  function chainedReport(): {
    vulnerabilities: Record<string, { severity: string; via: unknown[]; range: string }>;
  } {
    return {
      vulnerabilities: {
        braces: { severity: "high", via: [allowedAdvisory], range: "*" },
        micromatch: { severity: "high", via: ["braces"], range: ">=0.2.0" },
        "fast-glob": { severity: "high", via: ["micromatch"], range: "*" },
        chokidar: { severity: "high", via: ["braces"], range: "2.0.0 - 3.6.0" },
        tailwindcss: {
          severity: "high",
          via: ["chokidar", "fast-glob", "micromatch"],
          range: "2.1.0-canary.1 - 3.4.19",
        },
        "tailwindcss-animate": { severity: "high", via: ["tailwindcss"], range: "*" },
      },
    };
  }

  it("clears chains that are only vulnerable through allowlisted advisories", () => {
    expect(collectBlockingVulnerabilities(chainedReport(), "moderate", allowlist)).toEqual([]);
  });

  it("still blocks the same chain when the advisory is not allowlisted", () => {
    const blocking = collectBlockingVulnerabilities(chainedReport(), "moderate", []);

    expect(blocking.map((entry) => entry.name)).toEqual([
      "braces",
      "chokidar",
      "fast-glob",
      "micromatch",
      "tailwindcss",
      "tailwindcss-animate",
    ]);
  });

  it("still blocks packages with a fixable advisory beyond the allowlisted chain", () => {
    const report = chainedReport();
    report.vulnerabilities.micromatch.via = [
      "braces",
      {
        source: 1,
        name: "micromatch",
        dependency: "micromatch",
        title: "micromatch separate issue",
        url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc",
        severity: "high",
      },
    ];

    const blocking = collectBlockingVulnerabilities(report, "moderate", allowlist);

    expect(blocking.map((entry) => entry.name)).toEqual([
      "fast-glob",
      "micromatch",
      "tailwindcss",
      "tailwindcss-animate",
    ]);
  });
});

describe("collectDeprecatedPackages", () => {
  it("collects deprecated packages from the dependency tree", () => {
    const tree = {
      name: "root",
      dependencies: {
        direct: {
          name: "direct",
          deprecated: "Use direct-v2 instead",
        },
        nested: {
          name: "nested",
          dependencies: {
            child: {
              name: "child",
              deprecated: "No longer supported",
            },
          },
        },
      },
    };

    expect(collectDeprecatedPackages(tree)).toEqual([
      { name: "direct", message: "Use direct-v2 instead" },
      { name: "nested > child", message: "No longer supported" },
    ]);
  });
});
