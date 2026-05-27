import { eq, inArray } from "drizzle-orm";
import { adminSqlite, ensureAdminDatabaseReady } from "@/admin-db/client";
import {
  adminEmailCampaignLogs,
  adminTeamContactStatuses,
  adminTeamNotes,
  adminTeamPipelineStatuses,
} from "@/admin-db/schema";

export const ADMIN_PIPELINE_STATUSES = [
  "inactive",
  "trial",
  "risk",
  "active",
  "lost",
] as const;

export type AdminPipelineStatus = (typeof ADMIN_PIPELINE_STATUSES)[number];

export async function getAdminTeamNotesByIds(teamIds: number[]) {
  if (teamIds.length === 0) {
    return new Map<number, string | null>();
  }

  await ensureAdminDatabaseReady();

  const rows = await adminSqlite
    .select({
      teamId: adminTeamNotes.teamId,
      note: adminTeamNotes.note,
    })
    .from(adminTeamNotes)
    .where(inArray(adminTeamNotes.teamId, teamIds));

  return new Map(rows.map((row) => [row.teamId, row.note ?? null]));
}

export async function getAdminTeamPipelineStatusesByIds(teamIds: number[]) {
  if (teamIds.length === 0) {
    return new Map<number, AdminPipelineStatus | null>();
  }

  await ensureAdminDatabaseReady();

  const rows = await adminSqlite
    .select({
      teamId: adminTeamPipelineStatuses.teamId,
      status: adminTeamPipelineStatuses.status,
    })
    .from(adminTeamPipelineStatuses)
    .where(inArray(adminTeamPipelineStatuses.teamId, teamIds));

  return new Map(
    rows.map((row) => [
      row.teamId,
      ADMIN_PIPELINE_STATUSES.includes(row.status as AdminPipelineStatus)
        ? (row.status as AdminPipelineStatus)
        : null,
    ])
  );
}

export async function getAdminTeamContactStatusesByIds(teamIds: number[]) {
  if (teamIds.length === 0) {
    return new Map<number, { lastEmailSentAt: Date | null }>();
  }

  await ensureAdminDatabaseReady();

  const rows = await adminSqlite
    .select({
      teamId: adminTeamContactStatuses.teamId,
      lastEmailSentAt: adminTeamContactStatuses.lastEmailSentAt,
    })
    .from(adminTeamContactStatuses)
    .where(inArray(adminTeamContactStatuses.teamId, teamIds));

  return new Map(
    rows.map((row) => [
      row.teamId,
      {
        lastEmailSentAt: row.lastEmailSentAt ?? null,
      },
    ])
  );
}

export async function upsertAdminTeamNote(params: {
  teamId: number;
  note: string | null;
  updatedByUserId: number;
}) {
  await ensureAdminDatabaseReady();

  const now = new Date();
  const existing = await adminSqlite
    .select({ id: adminTeamNotes.id })
    .from(adminTeamNotes)
    .where(eq(adminTeamNotes.teamId, params.teamId))
    .limit(1);

  if (existing.length > 0) {
    await adminSqlite
      .update(adminTeamNotes)
      .set({
        note: params.note,
        updatedByUserId: params.updatedByUserId,
        updatedAt: now,
      })
      .where(eq(adminTeamNotes.teamId, params.teamId));
    return;
  }

  await adminSqlite.insert(adminTeamNotes).values({
    teamId: params.teamId,
    note: params.note,
    updatedByUserId: params.updatedByUserId,
    createdAt: now,
    updatedAt: now,
  });
}

export async function insertAdminEmailCampaignLog(params: {
  requestedByUserId: number;
  subject: string;
  message: string;
  ctaUrl?: string;
  ctaLabel?: string;
  requestedCount: number;
  sentCount: number;
  skippedCount: number;
}) {
  await ensureAdminDatabaseReady();

  await adminSqlite.insert(adminEmailCampaignLogs).values({
    requestedByUserId: params.requestedByUserId,
    subject: params.subject,
    message: params.message,
    ctaUrl: params.ctaUrl ?? null,
    ctaLabel: params.ctaLabel ?? null,
    requestedCount: params.requestedCount,
    sentCount: params.sentCount,
    skippedCount: params.skippedCount,
    createdAt: new Date(),
  });
}

export async function upsertAdminTeamPipelineStatus(params: {
  teamId: number;
  status: AdminPipelineStatus;
  updatedByUserId: number;
}) {
  await ensureAdminDatabaseReady();

  const now = new Date();
  const existing = await adminSqlite
    .select({ id: adminTeamPipelineStatuses.id })
    .from(adminTeamPipelineStatuses)
    .where(eq(adminTeamPipelineStatuses.teamId, params.teamId))
    .limit(1);

  if (existing.length > 0) {
    await adminSqlite
      .update(adminTeamPipelineStatuses)
      .set({
        status: params.status,
        updatedByUserId: params.updatedByUserId,
        updatedAt: now,
      })
      .where(eq(adminTeamPipelineStatuses.teamId, params.teamId));
    return;
  }

  await adminSqlite.insert(adminTeamPipelineStatuses).values({
    teamId: params.teamId,
    status: params.status,
    updatedByUserId: params.updatedByUserId,
    createdAt: now,
    updatedAt: now,
  });
}

export async function markAdminTeamEmailSent(params: {
  teamId: number;
  updatedByUserId: number;
}) {
  await ensureAdminDatabaseReady();

  const now = new Date();
  const existing = await adminSqlite
    .select({ id: adminTeamContactStatuses.id })
    .from(adminTeamContactStatuses)
    .where(eq(adminTeamContactStatuses.teamId, params.teamId))
    .limit(1);

  if (existing.length > 0) {
    await adminSqlite
      .update(adminTeamContactStatuses)
      .set({
        lastEmailSentAt: now,
        updatedByUserId: params.updatedByUserId,
        updatedAt: now,
      })
      .where(eq(adminTeamContactStatuses.teamId, params.teamId));
    return now;
  }

  await adminSqlite.insert(adminTeamContactStatuses).values({
    teamId: params.teamId,
    lastEmailSentAt: now,
    updatedByUserId: params.updatedByUserId,
    createdAt: now,
    updatedAt: now,
  });

  return now;
}
