import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FORBIDDEN_IMPORT_PATTERN = /from\s+["']@\/lib\/db\//;

const SCAN_DIRS = [
  "src/app",
  "src/components",
];

const IGNORE_PREFIXES = [
  "src/app/api/",
];

const ALLOWED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

function shouldIgnore(filePath) {
  const normalized = filePath.replaceAll(path.sep, "/");
  return IGNORE_PREFIXES.some((prefix) => normalized.startsWith(prefix));
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

    const ext = path.extname(entry.name);
    if (ALLOWED_EXTENSIONS.has(ext)) {
      const relPath = path.relative(ROOT, fullPath);
      if (!shouldIgnore(relPath)) {
        collected.push(relPath);
      }
    }
  }

  return collected;
}

function findViolations(files) {
  const violations = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(ROOT, file), "utf8");
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      if (FORBIDDEN_IMPORT_PATTERN.test(line)) {
        violations.push({
          file,
          line: index + 1,
          text: line.trim(),
        });
      }
    });
  }

  return violations;
}

const filesToScan = SCAN_DIRS.flatMap((dir) => collectFiles(path.join(ROOT, dir)));
const violations = findViolations(filesToScan);

if (violations.length > 0) {
  console.error("Architecture check failed: forbidden db imports detected.\n");
  console.error("Rule: do not import '@/lib/db/*' from UI/server-page layers.");
  console.error("Allowed exception: files under src/app/api/.\n");

  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line}`);
    console.error(`  ${violation.text}`);
  }

  process.exit(1);
}

console.log("Architecture check passed.");
