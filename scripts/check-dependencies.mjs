import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SEVERITY_ORDER = ["info", "low", "moderate", "high", "critical"];
const DEFAULT_AUDIT_LEVEL = "moderate";

function resolveAuditLevel() {
  const configured = process.env.NPM_AUDIT_LEVEL?.trim().toLowerCase() ?? DEFAULT_AUDIT_LEVEL;

  if (!SEVERITY_ORDER.includes(configured)) {
    console.error(
      `Invalid NPM_AUDIT_LEVEL "${configured}". Expected one of: ${SEVERITY_ORDER.join(", ")}.`
    );
    process.exit(1);
  }

  return configured;
}

function severityMeetsThreshold(severity, threshold) {
  const severityIndex = SEVERITY_ORDER.indexOf(severity);
  const thresholdIndex = SEVERITY_ORDER.indexOf(threshold);

  if (severityIndex === -1 || thresholdIndex === -1) {
    return false;
  }

  return severityIndex >= thresholdIndex;
}

export function collectBlockingVulnerabilities(auditReport, threshold) {
  const vulnerabilities = auditReport.vulnerabilities ?? {};
  const blocking = [];

  for (const [name, details] of Object.entries(vulnerabilities)) {
    const severity = details.severity ?? "info";
    if (!severityMeetsThreshold(severity, threshold)) {
      continue;
    }

    blocking.push({
      name,
      severity,
      via: Array.isArray(details.via)
        ? details.via
            .map((entry) => (typeof entry === "string" ? entry : entry.title ?? entry.name ?? "unknown"))
            .filter(Boolean)
        : [],
      range: details.range ?? "unknown",
      fixAvailable: Boolean(details.fixAvailable),
    });
  }

  blocking.sort((left, right) => {
    const leftIndex = SEVERITY_ORDER.indexOf(left.severity);
    const rightIndex = SEVERITY_ORDER.indexOf(right.severity);
    return rightIndex - leftIndex || left.name.localeCompare(right.name);
  });

  return blocking;
}

export function collectDeprecatedPackages(tree, path = []) {
  if (!tree || typeof tree !== "object") {
    return [];
  }

  const results = [];

  if (tree.deprecated) {
    results.push({
      name: path.length > 0 ? path.join(" > ") : (tree.name ?? "unknown"),
      message: tree.deprecated,
    });
  }

  const dependencies = tree.dependencies ?? {};
  for (const [name, dependency] of Object.entries(dependencies)) {
    results.push(...collectDeprecatedPackages(dependency, [...path, name]));
  }

  return results;
}

function runNpmAuditJson() {
  try {
    const output = execSync("npm audit --json", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return JSON.parse(output);
  } catch (error) {
    if (typeof error.stdout === "string" && error.stdout.trim().length > 0) {
      return JSON.parse(error.stdout);
    }

    throw error;
  }
}

function runNpmLsJson(depth) {
  const command = depth === 0 ? "npm ls --depth=0 --json" : "npm ls --all --json";

  try {
    const output = execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return JSON.parse(output);
  } catch (error) {
    if (typeof error.stdout === "string" && error.stdout.trim().length > 0) {
      return JSON.parse(error.stdout);
    }

    throw error;
  }
}

function shouldCheckTransitiveDeprecated() {
  return process.env.DEPRECATED_SCOPE?.trim().toLowerCase() === "transitive";
}

function printVulnerabilityFailures(vulnerabilities, threshold) {
  console.error("Dependency security check failed.\n");
  console.error(
    `Found ${vulnerabilities.length} npm audit finding(s) at or above "${threshold}".\n`
  );

  for (const vulnerability of vulnerabilities) {
    console.error(`- [${vulnerability.severity}] ${vulnerability.name} (${vulnerability.range})`);
    if (vulnerability.via.length > 0) {
      console.error(`  via: ${vulnerability.via.join("; ")}`);
    }
    if (vulnerability.fixAvailable) {
      console.error("  fix: run npm audit fix (review lockfile changes before committing)");
    }
  }

  console.error("");
  console.error("Resolve the findings above or adjust overrides before continuing.");
}

function printDeprecatedFailures(deprecatedPackages) {
  console.error("Dependency warning check failed.\n");
  console.error(`Found ${deprecatedPackages.length} deprecated package(s).\n`);

  for (const pkg of deprecatedPackages) {
    console.error(`- ${pkg.name}`);
    console.error(`  ${pkg.message}`);
  }

  console.error("");
  console.error("Replace deprecated packages or pin supported versions before continuing.");
}

function main() {
  const auditLevel = resolveAuditLevel();
  const auditReport = runNpmAuditJson();
  const blockingVulnerabilities = collectBlockingVulnerabilities(auditReport, auditLevel);

  const deprecatedTree = runNpmLsJson(shouldCheckTransitiveDeprecated() ? Infinity : 0);
  const deprecatedPackages = collectDeprecatedPackages(deprecatedTree);

  if (blockingVulnerabilities.length === 0 && deprecatedPackages.length === 0) {
    console.log(
      `Dependency check passed (npm audit >= ${auditLevel}: 0, deprecated packages: 0).`
    );
    process.exit(0);
  }

  if (blockingVulnerabilities.length > 0) {
    printVulnerabilityFailures(blockingVulnerabilities, auditLevel);
  }

  if (deprecatedPackages.length > 0) {
    printDeprecatedFailures(deprecatedPackages);
  }

  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
