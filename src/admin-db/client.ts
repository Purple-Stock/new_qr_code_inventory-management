import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { getAdminDatabaseAuthToken, getAdminDatabaseUrl } from "./config";
import * as schema from "./schema";

const adminDatabaseUrl = getAdminDatabaseUrl();

const adminClient = createClient({
  url: adminDatabaseUrl,
  authToken: getAdminDatabaseAuthToken(adminDatabaseUrl),
});

let schemaReadyPromise: Promise<void> | null = null;

async function ensureAdminSchema() {
  await adminClient.execute(`
    CREATE TABLE IF NOT EXISTS admin_team_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL UNIQUE,
      note TEXT,
      updated_by_user_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  await adminClient.execute(`
    CREATE TABLE IF NOT EXISTS admin_email_campaign_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requested_by_user_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      cta_url TEXT,
      cta_label TEXT,
      requested_count INTEGER NOT NULL DEFAULT 0,
      sent_count INTEGER NOT NULL DEFAULT 0,
      skipped_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);

  await adminClient.execute(`
    CREATE INDEX IF NOT EXISTS index_admin_email_campaign_logs_on_requested_by_user_id
    ON admin_email_campaign_logs(requested_by_user_id);
  `);

  await adminClient.execute(`
    CREATE TABLE IF NOT EXISTS admin_team_pipeline_statuses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL UNIQUE,
      status TEXT NOT NULL,
      updated_by_user_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  await adminClient.execute(`
    CREATE INDEX IF NOT EXISTS index_admin_team_pipeline_statuses_on_status
    ON admin_team_pipeline_statuses(status);
  `);

  await adminClient.execute(`
    CREATE TABLE IF NOT EXISTS admin_team_contact_statuses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL UNIQUE,
      last_email_sent_at INTEGER,
      updated_by_user_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  await adminClient.execute(`
    CREATE INDEX IF NOT EXISTS index_admin_team_contact_statuses_on_last_email_sent_at
    ON admin_team_contact_statuses(last_email_sent_at);
  `);
}

export function ensureAdminDatabaseReady() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = ensureAdminSchema();
  }

  return schemaReadyPromise;
}

// @ts-ignore - Drizzle types may have issues with schema parameter
export const adminSqlite = drizzle(adminClient, { schema });
