import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ALLOWED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

const DB_IMPORT_PATTERN = /from\s+["']@\/lib\/db\//;
const EXPLICIT_ANY_PATTERN = /\b(as\s+any|:\s*any)\b/;
const TWO_ARG_ERROR_RESPONSE_PATTERN = /errorResponse\s*\(\s*[^,]+,\s*[^,)\n]+\s*\)/;
const DIRECT_NEXTRESPONSE_JSON_PATTERN = /\bNextResponse\.json\s*\(/;
const INTERNAL_ERROR_RESPONSE_PATTERN = /\binternalErrorResponse\s*\(/;

const ANY_DEBT_ALLOWLIST = new Set();

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

const allApiFiles = collectFiles(path.join(ROOT, "src/app/api"));
const serviceAndApiFiles = collectFiles(path.join(ROOT, "src/lib/services"))
  .concat(collectFiles(path.join(ROOT, "src/app/api")));

const uiDbViolations = scanForPattern(uiAndPagesFiles, DB_IMPORT_PATTERN);
const apiDbViolations = scanForPattern(allApiFiles, DB_IMPORT_PATTERN);

const anyMatches = scanForPattern(serviceAndApiFiles, EXPLICIT_ANY_PATTERN);
const anyViolations = anyMatches.filter((match) => !ANY_DEBT_ALLOWLIST.has(match.file));
const anyDebt = anyMatches.filter((match) => ANY_DEBT_ALLOWLIST.has(match.file));
const errorResponseViolations = scanForPattern(allApiFiles, TWO_ARG_ERROR_RESPONSE_PATTERN);
const directJsonResponseViolations = scanForPattern(
  allApiFiles,
  DIRECT_NEXTRESPONSE_JSON_PATTERN
);
const internalErrorHelperViolations = scanForPattern(
  allApiFiles,
  INTERNAL_ERROR_RESPONSE_PATTERN
);

if (
  uiDbViolations.length > 0 ||
  apiDbViolations.length > 0 ||
  anyViolations.length > 0 ||
  errorResponseViolations.length > 0 ||
  directJsonResponseViolations.length > 0 ||
  internalErrorHelperViolations.length > 0
) {
  console.error("Architecture check failed.\n");

  printViolations(
    "Rule 1: do not import '@/lib/db/*' from UI/server-page layers (src/app except api, src/components).",
    uiDbViolations
  );

  printViolations(
    "Rule 2: do not import '@/lib/db/*' from API routes (src/app/api/*).",
    apiDbViolations
  );

  printViolations(
    "Rule 3: avoid explicit 'any' in services/api (allowed only in temporary debt allowlist).",
    anyViolations
  );

  printViolations(
    "Rule 4: API routes must call errorResponse with explicit errorCode (avoid 2-arg errorResponse).",
    errorResponseViolations
  );

  printViolations(
    "Rule 5: do not call NextResponse.json directly in API routes (use api-route helpers).",
    directJsonResponseViolations
  );

  printViolations(
    "Rule 6: avoid internalErrorResponse in API routes that use services (prefer serviceErrorResponse(internalServiceError(...))).",
    internalErrorHelperViolations
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
