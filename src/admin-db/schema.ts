import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const adminTeamNotes = sqliteTable(
  "admin_team_notes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    teamId: integer("team_id").notNull(),
    note: text("note"),
    updatedByUserId: integer("updated_by_user_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    teamIdIdx: uniqueIndex("index_admin_team_notes_on_team_id").on(table.teamId),
  })
);

export const adminEmailCampaignLogs = sqliteTable(
  "admin_email_campaign_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    requestedByUserId: integer("requested_by_user_id").notNull(),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    ctaUrl: text("cta_url"),
    ctaLabel: text("cta_label"),
    requestedCount: integer("requested_count").notNull().default(0),
    sentCount: integer("sent_count").notNull().default(0),
    skippedCount: integer("skipped_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    requestedByIdx: index("index_admin_email_campaign_logs_on_requested_by_user_id").on(
      table.requestedByUserId
    ),
  })
);

export const adminTeamPipelineStatuses = sqliteTable(
  "admin_team_pipeline_statuses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    teamId: integer("team_id").notNull(),
    status: text("status").notNull(),
    updatedByUserId: integer("updated_by_user_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    teamIdIdx: uniqueIndex("index_admin_team_pipeline_statuses_on_team_id").on(table.teamId),
    statusIdx: index("index_admin_team_pipeline_statuses_on_status").on(table.status),
  })
);

export const adminTeamContactStatuses = sqliteTable(
  "admin_team_contact_statuses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    teamId: integer("team_id").notNull(),
    lastEmailSentAt: integer("last_email_sent_at", { mode: "timestamp" }),
    updatedByUserId: integer("updated_by_user_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    teamIdIdx: uniqueIndex("index_admin_team_contact_statuses_on_team_id").on(table.teamId),
    emailSentIdx: index("index_admin_team_contact_statuses_on_last_email_sent_at").on(table.lastEmailSentAt),
  })
);
