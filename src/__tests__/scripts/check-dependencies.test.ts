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

    expect(collectBlockingVulnerabilities(report, "moderate")).toEqual([
      expect.objectContaining({ name: "pkg-high", severity: "high" }),
      expect.objectContaining({ name: "pkg-moderate", severity: "moderate" }),
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
