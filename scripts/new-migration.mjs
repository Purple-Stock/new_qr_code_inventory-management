#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, "../src/db/migrations");

function printUsage() {
  console.log("Usage:");
  console.log("  npm run db:new -- <migration_name>");
  console.log("Examples:");
  console.log("  npm run db:new -- add_items_status");
  console.log("  npm run db:new -- \"add items status\"");
}

function normalizeName(rawParts) {
  const raw = rawParts.join(" ").trim();

  if (!raw) {
    throw new Error("Migration name is required.");
  }

  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

  if (!normalized) {
    throw new Error("Migration name must contain letters or numbers.");
  }

  return normalized;
}

function getNextMigrationNumber(files) {
  const used = files
    .filter((file) => file.endsWith(".sql") && !file.endsWith(".down.sql"))
    .map((file) => {
      const match = file.match(/^(\d{3})_/);
      return match ? Number.parseInt(match[1], 10) : null;
    })
    .filter((num) => Number.isInteger(num));

  const max = used.length > 0 ? Math.max(...used) : 0;
  return String(max + 1).padStart(3, "0");
}

function fileTemplate(direction) {
  const header = direction === "up" ? "UP" : "DOWN";
  return `-- ${header} migration\n-- Write your SQL here\n`;
}

try {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  const name = normalizeName(args);
  const files = fs.readdirSync(migrationsDir);
  const nextNumber = getNextMigrationNumber(files);

  const upFilename = `${nextNumber}_${name}.sql`;
  const downFilename = `${nextNumber}_${name}.down.sql`;

  const upPath = path.join(migrationsDir, upFilename);
  const downPath = path.join(migrationsDir, downFilename);

  if (fs.existsSync(upPath) || fs.existsSync(downPath)) {
    throw new Error(`Migration files already exist for prefix ${nextNumber}_${name}.`);
  }

  fs.writeFileSync(upPath, fileTemplate("up"), { encoding: "utf8", flag: "wx" });
  fs.writeFileSync(downPath, fileTemplate("down"), { encoding: "utf8", flag: "wx" });

  console.log(`Created: ${path.relative(process.cwd(), upPath)}`);
  console.log(`Created: ${path.relative(process.cwd(), downPath)}`);
} catch (error) {
  if (error instanceof Error) {
    console.error(`Failed to create migration: ${error.message}`);
  } else {
    console.error("Failed to create migration.");
  }
  process.exit(1);
}
