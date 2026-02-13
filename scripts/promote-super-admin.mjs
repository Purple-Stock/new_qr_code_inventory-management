import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = { email: "", envFile: "" };

  for (const arg of argv) {
    if (arg.startsWith("--email=")) args.email = arg.slice("--email=".length).trim();
    if (arg.startsWith("--env-file=")) args.envFile = arg.slice("--env-file=".length).trim();
  }

  return args;
}

function loadEnvFileIfProvided(envFile) {
  if (!envFile) return;
  const absolute = path.isAbsolute(envFile) ? envFile : path.resolve(process.cwd(), envFile);
  if (!fs.existsSync(absolute)) throw new Error(`Env file not found: ${absolute}`);

  for (const rawLine of fs.readFileSync(absolute, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sep = line.indexOf("=");
    if (sep <= 0) continue;
    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function getDatabaseConfig() {
  const databaseUrl = process.env.DATABASE_URL?.trim() || "file:./src/db.sqlite";
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

  if (databaseUrl.startsWith("libsql://") && !authToken) {
    throw new Error("TURSO_AUTH_TOKEN is required for libsql:// DATABASE_URL");
  }

  return { databaseUrl, authToken };
}

async function main() {
  const { email, envFile } = parseArgs(process.argv.slice(2));
  const normalizedEmail = email.toLowerCase().trim();

  if (!normalizedEmail) {
    throw new Error("Usage: npm run user:promote-super-admin -- --email=<email> [--env-file=.env.prod.local]");
  }

  loadEnvFileIfProvided(envFile);

  const { databaseUrl, authToken } = getDatabaseConfig();
  const client = createClient({ url: databaseUrl, authToken });

  try {
    const found = await client.execute({
      sql: "SELECT id, email FROM users WHERE lower(email) = ? LIMIT 1",
      args: [normalizedEmail],
    });

    if (found.rows.length === 0) throw new Error(`User not found: ${normalizedEmail}`);

    const user = found.rows[0];

    await client.batch(
      [
        {
          sql: `
            CREATE TABLE IF NOT EXISTS super_admin_users (
              user_id INTEGER PRIMARY KEY,
              created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
              updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
              FOREIGN KEY (user_id) REFERENCES users(id)
            )
          `,
        },
        {
          sql: "CREATE UNIQUE INDEX IF NOT EXISTS index_super_admin_users_on_user_id ON super_admin_users(user_id)",
        },
        {
          sql: `
            INSERT INTO super_admin_users (user_id, created_at, updated_at)
            VALUES (?, strftime('%s','now'), strftime('%s','now'))
            ON CONFLICT(user_id) DO UPDATE SET updated_at = strftime('%s','now')
          `,
          args: [user.id],
        },
      ],
      "write"
    );

    console.log(`User ${normalizedEmail} granted super admin access.`);
  } finally {
    client.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
