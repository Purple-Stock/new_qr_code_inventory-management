import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

function parseArgs(argv) {
  const args = {
    envFile: "",
    port: "",
  };

  for (const arg of argv) {
    if (arg.startsWith("--env-file=")) args.envFile = arg.slice("--env-file=".length).trim();
    if (arg.startsWith("--port=")) args.port = arg.slice("--port=".length).trim();
  }

  return args;
}

function loadEnvFileIfProvided(envFile) {
  if (!envFile) return;

  const absolute = path.isAbsolute(envFile) ? envFile : path.resolve(process.cwd(), envFile);
  if (!fs.existsSync(absolute)) {
    throw new Error(`Env file not found: ${absolute}`);
  }

  for (const rawLine of fs.readFileSync(absolute, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    process.env[key] = value;
  }
}

async function main() {
  const { envFile, port } = parseArgs(process.argv.slice(2));

  loadEnvFileIfProvided(envFile);

  if (port) {
    process.env.PORT = port;
  }

  if (!process.env.NEXT_DIST_DIR) {
    process.env.NEXT_DIST_DIR = port ? `.next-dev-${port}` : ".next-dev";
  }

  const child = spawn("npm", ["run", "dev"], {
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
