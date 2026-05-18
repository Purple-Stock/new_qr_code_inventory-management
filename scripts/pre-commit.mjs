import { execSync } from "node:child_process";

function getStagedFiles() {
  const output = execSync("git diff --cached --name-only --diff-filter=ACMR", {
    encoding: "utf8",
  });

  return output
    .split("\n")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function run(command, label) {
  console.log(`Running ${label}...`);
  execSync(command, { stdio: "inherit" });
}

const stagedFiles = getStagedFiles();

if (stagedFiles.length === 0) {
  console.log("No staged files detected. Skipping pre-commit checks.");
  process.exit(0);
}

const dependencyFiles = new Set(["package.json", "package-lock.json", "npm-shrinkwrap.json"]);
const architecturePrefixes = [
  "src/app/api/",
  "src/lib/services/",
  "src/__tests__/scripts/",
  "scripts/check-architecture.mjs",
  "scripts/check-test-policy.mjs",
];

const shouldRunCi = stagedFiles.some((file) => dependencyFiles.has(file));
const shouldRunArchitecture = stagedFiles.some((file) =>
  architecturePrefixes.some((prefix) => file.startsWith(prefix))
);

if (!shouldRunCi && !shouldRunArchitecture) {
  console.log("No dependency or architecture-sensitive changes detected. Skipping pre-commit checks.");
  process.exit(0);
}

if (shouldRunCi) {
  run("npm ci", "npm ci");
}

if (shouldRunArchitecture) {
  run("npm run verify:architecture", "architecture verification");
}

console.log("Pre-commit checks passed.");
