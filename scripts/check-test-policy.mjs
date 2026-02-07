import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SERVICES_DIR = path.join(ROOT, "src/lib/services");
const TESTS_DIR = path.join(ROOT, "src/__tests__/lib/services");

const SERVICE_FILES_EXCLUDED = new Set(["errors.ts", "mappers.ts", "types.ts"]);

// Temporary debt list: existing services without dedicated suite yet.
// New services must add their own `<service>.service.test.ts`.
const MISSING_TEST_ALLOWLIST = new Set([
  "src/lib/services/reports.ts",
  "src/lib/services/team-dashboard.ts",
  "src/lib/services/transactions.ts",
]);

function normalize(filePath) {
  return filePath.replaceAll(path.sep, "/");
}

function collectServiceFiles() {
  if (!fs.existsSync(SERVICES_DIR)) return [];

  return fs
    .readdirSync(SERVICES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.endsWith(".ts"))
    .filter((name) => !SERVICE_FILES_EXCLUDED.has(name))
    .map((name) => normalize(path.join("src/lib/services", name)));
}

function hasDedicatedSuite(serviceFile) {
  const base = path.basename(serviceFile, ".ts");
  const testPath = path.join(TESTS_DIR, `${base}.service.test.ts`);
  return fs.existsSync(testPath);
}

const services = collectServiceFiles();

const missingSuites = services.filter((serviceFile) => !hasDedicatedSuite(serviceFile));
const blockingMissing = missingSuites.filter((serviceFile) => !MISSING_TEST_ALLOWLIST.has(serviceFile));
const debtMissing = missingSuites.filter((serviceFile) => MISSING_TEST_ALLOWLIST.has(serviceFile));

if (blockingMissing.length > 0) {
  console.error("Test policy check failed.\n");
  console.error(
    "Each service module must have a dedicated test suite at src/__tests__/lib/services/<name>.service.test.ts.\n"
  );
  for (const serviceFile of blockingMissing) {
    console.error(`- Missing suite for ${serviceFile}`);
  }
  process.exit(1);
}

console.log("Test policy check passed.");

if (debtMissing.length > 0) {
  console.log("");
  console.log(`Note: temporary missing service suites (${debtMissing.length})`);
  for (const serviceFile of debtMissing) {
    console.log(`- ${serviceFile}`);
  }
}
