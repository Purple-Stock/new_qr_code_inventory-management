import { rollbackDatabase } from "./init-db";

function parseSteps(argv: string[]): number {
  const stepsArg = argv.find((arg) => arg.startsWith("--steps="));
  const shortArgIndex = argv.findIndex((arg) => arg === "--steps" || arg === "-s");

  if (!stepsArg && shortArgIndex === -1) {
    return 1;
  }

  const raw =
    stepsArg?.split("=")[1] ??
    (shortArgIndex >= 0 ? argv[shortArgIndex + 1] : undefined);
  const parsed = Number.parseInt(raw ?? "", 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("Invalid --steps value. Use a positive integer.");
  }

  return parsed;
}

const steps = parseSteps(process.argv.slice(2));

rollbackDatabase(steps).catch((error) => {
  if (error instanceof Error) {
    console.error(`Rollback failed: ${error.message}`);
  } else {
    console.error("Rollback failed.");
  }
  process.exit(1);
});
