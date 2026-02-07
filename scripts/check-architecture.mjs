import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ALLOWED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

const DB_IMPORT_PATTERN = /from\s+["']@\/lib\/db\//;
const EXPLICIT_ANY_PATTERN = /\b(as\s+any|:\s*any)\b/;

const ANY_DEBT_ALLOWLIST = new Set([
  "src/lib/services/items.ts",
  "src/lib/services/locations.ts",
  "src/lib/services/stock-transactions.ts",
  "src/lib/services/teams.ts",
  "src/lib/services/transactions.ts",
  "src/app/api/teams/route.ts",
  "src/app/api/teams/[id]/route.ts",
  "src/app/api/teams/[id]/items/route.ts",
  "src/app/api/teams/[id]/locations/route.ts",
  "src/app/api/teams/[id]/locations/[locationId]/route.ts",
  "src/app/api/teams/[id]/stock-transactions/route.ts",
  "src/app/api/teams/[id]/transactions/route.ts",
  "src/app/api/teams/[id]/transactions/[transactionId]/route.ts",
  "src/app/api/teams/[id]/users/[userId]/route.ts",
]);

function normalize(filePath) {
  return filePath.replaceAll(path.sep, "/");
}

function collectFiles(dirPath, collected = []) {
  if (!fs.existsSync(dirPath)) {
    return collected;
  }

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, collected);
      continue;
    }

    if (ALLOWED_EXTENSIONS.has(path.extname(entry.name))) {
      collected.push(normalize(path.relative(ROOT, fullPath)));
    }
  }

  return collected;
}

function scanForPattern(files, pattern) {
  const matches = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(ROOT, file), "utf8");
    const lines = content.split("\n");
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        matches.push({
          file,
          line: index + 1,
          text: line.trim(),
        });
      }
    });
  }
  return matches;
}

function printViolations(title, violations) {
  if (violations.length === 0) return;
  console.error(`${title}\n`);
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line}`);
    console.error(`  ${violation.text}`);
  }
  console.error("");
}

const uiAndPagesFiles = collectFiles(path.join(ROOT, "src/app"))
  .filter((file) => !file.startsWith("src/app/api/"))
  .concat(collectFiles(path.join(ROOT, "src/components")));

const teamApiFiles = collectFiles(path.join(ROOT, "src/app/api/teams"));
const serviceAndApiFiles = collectFiles(path.join(ROOT, "src/lib/services"))
  .concat(collectFiles(path.join(ROOT, "src/app/api")));

const uiDbViolations = scanForPattern(uiAndPagesFiles, DB_IMPORT_PATTERN);
const teamApiDbViolations = scanForPattern(teamApiFiles, DB_IMPORT_PATTERN);

const anyMatches = scanForPattern(serviceAndApiFiles, EXPLICIT_ANY_PATTERN);
const anyViolations = anyMatches.filter((match) => !ANY_DEBT_ALLOWLIST.has(match.file));
const anyDebt = anyMatches.filter((match) => ANY_DEBT_ALLOWLIST.has(match.file));

if (uiDbViolations.length > 0 || teamApiDbViolations.length > 0 || anyViolations.length > 0) {
  console.error("Architecture check failed.\n");

  printViolations(
    "Rule 1: do not import '@/lib/db/*' from UI/server-page layers (src/app except api, src/components).",
    uiDbViolations
  );

  printViolations(
    "Rule 2: do not import '@/lib/db/*' from team API routes (src/app/api/teams).",
    teamApiDbViolations
  );

  printViolations(
    "Rule 3: avoid explicit 'any' in services/api (allowed only in temporary debt allowlist).",
    anyViolations
  );

  process.exit(1);
}

console.log("Architecture check passed.");

if (anyDebt.length > 0) {
  console.log("");
  console.log(`Note: temporary explicit-any debt still present (${anyDebt.length} occurrences).`);
  const byFile = new Map();
  for (const match of anyDebt) {
    byFile.set(match.file, (byFile.get(match.file) || 0) + 1);
  }
  for (const [file, count] of byFile.entries()) {
    console.log(`- ${file}: ${count}`);
  }
}
