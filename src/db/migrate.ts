import "dotenv/config";
import { ensureDatabase } from "./init-db";

ensureDatabase().catch((error) => {
  if (error instanceof Error) {
    console.error(`Migration failed: ${error.message}`);
  } else {
    console.error("Migration failed.");
  }
  process.exit(1);
});
