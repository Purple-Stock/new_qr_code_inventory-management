import { findUserById } from "@/lib/db/users";
import { getAdminTeamsByIds, getAdminTeamsWithStats } from "@/lib/db/admin";
import {
  ADMIN_PIPELINE_STATUSES,
  type AdminPipelineStatus,
  insertAdminEmailCampaignLog,
  markAdminTeamEmailSent,
  upsertAdminTeamNote,
  upsertAdminTeamPipelineStatus,
} from "@/lib/db/admin-internal";
import { isSuperAdminUser } from "@/lib/db/super-admin";
import { ERROR_CODES } from "@/lib/errors";
import { sendResendEmail } from "@/lib/email/resend";
import {
  internalServiceError,
  makeServiceError,
  validationServiceError,
} from "@/lib/services/errors";
import { toTeamDto } from "@/lib/services/mappers";
import type { ServiceResult, TeamDto } from "@/lib/services/types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function isEmailInSuperAdminAllowlist(email: string): boolean {
  const raw = process.env.SUPER_ADMIN_EMAILS?.trim();
  if (!raw) return false;
  const set = new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0)
  );
  return set.has(email.trim().toLowerCase());
}

function toPositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return parsed;
}

async function ensureSuperAdminAccess(requestUserId: number | null) {
  if (!requestUserId) {
    return {
      ok: false as const,
      error: makeServiceError(401, ERROR_CODES.USER_NOT_AUTHENTICATED, "User not authenticated"),
    };
  }

  const requestUser = await findUserById(requestUserId);
  if (!requestUser) {
    return {
      ok: false as const,
      error: makeServiceError(401, ERROR_CODES.USER_NOT_AUTHENTICATED, "User not authenticated"),
    };
  }

  const hasSuperAdminAccess =
    requestUser.role === "super_admin" ||
    (await isSuperAdminUser(requestUser.id)) ||
    isEmailInSuperAdminAllowlist(requestUser.email);
  if (!hasSuperAdminAccess) {
    return {
      ok: false as const,
      error: makeServiceError(
        403,
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        "Super admin access required"
      ),
    };
  }

  return { ok: true as const, data: requestUser };
}

function isNonSubscriberStatus(status: string | null | undefined) {
  return !status || status === "canceled" || status === "incomplete_expired";
}

function escapeHtml(value: string) {
  return value
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;")
    .split('"').join("&quot;")
    .split("'").join("&#39;");
}

function messageToHtml(message: string) {
  return escapeHtml(message)
    .replace(
      /(https?:\/\/[^\s<]+)/g,
      (url) =>
        `<a href="${url}" style="color:#5b3df5;text-decoration:none;font-weight:700;">${url}</a>`
    )
    .split("\n").join("<br />");
}

function buildCampaignHtml(params: {
  teamName: string;
  message: string;
  ctaUrl?: string;
  ctaLabel?: string;
}) {
  const safeTeamName = escapeHtml(params.teamName);
  const safeCtaUrl = params.ctaUrl ? escapeHtml(params.ctaUrl) : null;
  const safeCtaLabel = params.ctaLabel ? escapeHtml(params.ctaLabel) : "Ativar assinatura";
  const currentYear = new Date().getFullYear();

  return `
    <div style="margin:0;padding:0;background:#f4f2ff;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f2ff;margin:0;padding:0;width:100%;">
        <tr>
          <td align="center" style="padding:32px 16px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:680px;width:100%;">
              <tr>
                <td style="padding:0 0 18px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
                    <tr>
                      <td align="left">
                        <span style="display:inline-block;padding:10px 16px;border-radius:999px;background:#efe9ff;border:1px solid #dccfff;color:#5b3df5;font-family:Poppins,Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">
                          Purple Stock
                        </span>
                      </td>
                      <td align="right" style="font-family:Poppins,Arial,sans-serif;font-size:13px;color:#6f6787;">
                        Estoque com QR Code
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="border-radius:28px;background:linear-gradient(135deg,#f7f3ff 0%,#ffffff 54%,#eef4ff 100%);border:1px solid #e6dcff;padding:40px 36px 28px;box-shadow:0 24px 60px rgba(88,63,180,0.10);">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
                    <tr>
                      <td style="padding:0 0 20px;">
                        <div style="width:64px;height:64px;border-radius:20px;background:linear-gradient(135deg,#6d47ff 0%,#3d7cff 100%);text-align:center;line-height:64px;font-family:Poppins,Arial,sans-serif;font-size:24px;font-weight:700;color:#ffffff;box-shadow:0 14px 28px rgba(79,70,229,0.25);">
                          PS
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:40px;line-height:1.05;font-weight:700;color:#131a2d;letter-spacing:-0.03em;">
                        Bem vindo Time ${safeTeamName}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:0 0 24px;font-family:Poppins,Arial,sans-serif;font-size:17px;line-height:1.7;color:#4f566b;">
                        Centralize seu estoque, acompanhe movimentacoes e tenha um canal direto com o time Purple Stock para acelerar a ativacao.
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:0 0 24px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-radius:22px;background:#ffffff;border:1px solid #ece6ff;">
                          <tr>
                            <td style="padding:24px;font-family:Poppins,Arial,sans-serif;font-size:16px;line-height:1.85;color:#1d2438;">
                              ${messageToHtml(params.message)}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    ${
                      safeCtaUrl
                        ? `<tr>
                            <td style="padding:0 0 24px;">
                              <a href="${safeCtaUrl}" style="display:inline-block;padding:15px 22px;border-radius:14px;background:#5b3df5;color:#ffffff;text-decoration:none;font-family:Poppins,Arial,sans-serif;font-size:15px;font-weight:700;box-shadow:0 14px 30px rgba(91,61,245,0.22);">
                                ${safeCtaLabel}
                              </a>
                            </td>
                          </tr>`
                        : ""
                    }
                    <tr>
                      <td style="padding:0 0 18px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
                          <tr>
                            <td style="padding:0 12px 0 0;">
                              <div style="padding:16px 18px;border-radius:18px;background:#f6f2ff;border:1px solid #e7dcff;font-family:Poppins,Arial,sans-serif;">
                                <div style="font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#7258d5;padding-bottom:6px;">
                                  Agendar demo
                                </div>
                                <div style="font-size:14px;line-height:1.6;color:#374151;">
                                  Fale direto com o time para tirar duvidas, validar fluxo e destravar implantacao.
                                </div>
                              </div>
                            </td>
                            <td style="padding:0 0 0 12px;">
                              <div style="padding:16px 18px;border-radius:18px;background:#eef5ff;border:1px solid #d9e8ff;font-family:Poppins,Arial,sans-serif;">
                                <div style="font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#3e6fe0;padding-bottom:6px;">
                                  Suporte rapido
                                </div>
                                <div style="font-size:14px;line-height:1.6;color:#374151;">
                                  WhatsApp <a href="https://wa.me/5511995597242" style="color:#3e6fe0;text-decoration:none;font-weight:700;">(11) 99559-7242</a>
                                </div>
                              </div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 8px 0;font-family:Poppins,Arial,sans-serif;font-size:12px;line-height:1.7;color:#7a7392;text-align:center;">
                  Purple Stock • ${currentYear}<br />
                  Plataforma para controle de estoque, inventario e operacao com QR Code.<br />
                  <a href="https://www.purplestock.com.br" style="color:#5b3df5;text-decoration:none;font-weight:700;">www.purplestock.com.br</a><br />
                  Se preferir, basta responder este email. Sua mensagem sera recebida pelo nosso time.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

function mapAdminEmailProviderError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (normalized.includes("domain is not verified")) {
    return makeServiceError(
      502,
      ERROR_CODES.EMAIL_PROVIDER_ERROR,
      "O dominio purplestock.com.br ainda nao foi verificado no Resend. Verifique o dominio em https://resend.com/domains antes de enviar emails pelo admin."
    );
  }

  if (normalized.includes("resend send failed")) {
    return makeServiceError(
      502,
      ERROR_CODES.EMAIL_PROVIDER_ERROR,
      `Falha no envio via Resend. Detalhe: ${message.replace(/^Resend send failed:\s*/i, "")}`
    );
  }

  return makeServiceError(502, ERROR_CODES.EMAIL_PROVIDER_ERROR, "Failed to send email via Resend");
}

export async function getAllTeamsForSuperAdmin(params: {
  requestUserId: number | null;
  page?: string;
  pageSize?: string;
  search?: string;
}): Promise<
  ServiceResult<{
    teams: TeamDto[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }>
> {
  const access = await ensureSuperAdminAccess(params.requestUserId);
  if (!access.ok) {
    return access;
  }

  const page = toPositiveInteger(params.page, DEFAULT_PAGE);
  const pageSize = Math.min(toPositiveInteger(params.pageSize, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);

  try {
    const { teams, total } = await getAdminTeamsWithStats({
      page,
      pageSize,
      search: params.search,
    });

    // Basic audit trail for privileged reads.
    console.info("[AUDIT] super_admin_read_all_teams", {
      requestUserId: params.requestUserId,
      page,
      pageSize,
      search: params.search ?? null,
      total,
      at: new Date().toISOString(),
    });

    const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);

    return {
      ok: true,
      data: {
        teams: teams.map(toTeamDto),
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching teams for super admin:", error);
    return {
      ok: false,
      error: internalServiceError("An error occurred while fetching teams for super admin"),
    };
  }
}

export async function sendNonSubscriberCampaign(params: {
  requestUserId: number | null;
  teamIds: number[];
  subject: string;
  message: string;
  ctaUrl?: string;
  ctaLabel?: string;
}): Promise<
  ServiceResult<{
    requested: number;
    sent: Array<{ teamId: number; teamName: string; email: string; emailId: string }>;
    skipped: Array<{ teamId: number; teamName: string; email: string | null; reason: string }>;
  }>
> {
  const access = await ensureSuperAdminAccess(params.requestUserId);
  if (!access.ok) {
    return access;
  }

  const subject = params.subject.trim();
  const message = params.message.trim();
  const ctaUrl = params.ctaUrl?.trim();
  const ctaLabel = params.ctaLabel?.trim();
  const uniqueTeamIds = [
    ...new Set(params.teamIds.filter((teamId) => Number.isInteger(teamId) && teamId > 0)),
  ];

  if (!subject) {
    return { ok: false, error: validationServiceError("Subject is required") };
  }
  if (!message) {
    return { ok: false, error: validationServiceError("Message is required") };
  }
  if (uniqueTeamIds.length === 0) {
    return { ok: false, error: validationServiceError("Select at least one team") };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    return {
      ok: false,
      error: makeServiceError(
        500,
        ERROR_CODES.EMAIL_NOT_CONFIGURED,
        "RESEND_API_KEY and RESEND_FROM_EMAIL must be configured"
      ),
    };
  }

  try {
    const teams = await getAdminTeamsByIds(uniqueTeamIds);
    const teamById = new Map(teams.map((team) => [team.id, team]));
    const sent: Array<{ teamId: number; teamName: string; email: string; emailId: string }> = [];
    const skipped: Array<{ teamId: number; teamName: string; email: string | null; reason: string }> =
      [];

    for (const teamId of uniqueTeamIds) {
      const team = teamById.get(teamId);
      if (!team) {
        skipped.push({
          teamId,
          teamName: `Team #${teamId}`,
          email: null,
          reason: "Cliente nao encontrado",
        });
        continue;
      }

      if (!isNonSubscriberStatus(team.stripeSubscriptionStatus)) {
        skipped.push({
          teamId: team.id,
          teamName: team.name,
          email: team.ownerEmail ?? null,
          reason: "Cliente possui assinatura ativa ou em cobranca",
        });
        continue;
      }

      if (!team.ownerEmail) {
        skipped.push({
          teamId: team.id,
          teamName: team.name,
          email: null,
          reason: "Cliente sem email cadastrado",
        });
        continue;
      }

      try {
        const emailId = await sendResendEmail({
          apiKey,
          from,
          to: team.ownerEmail,
          subject,
          html: buildCampaignHtml({
            teamName: team.companyName || team.name,
            message,
            ctaUrl,
            ctaLabel,
          }),
          text: `${message}${ctaUrl ? `\n\n${ctaLabel || "Ativar assinatura"}: ${ctaUrl}` : ""}`,
        });

        sent.push({
          teamId: team.id,
          teamName: team.name,
          email: team.ownerEmail,
          emailId,
        });
      } catch (error) {
        console.error("Failed to send Resend email for team", {
          teamId: team.id,
          error,
        });
        skipped.push({
          teamId: team.id,
          teamName: team.name,
          email: team.ownerEmail,
          reason: "Falha no envio via Resend",
        });
      }
    }

    await insertAdminEmailCampaignLog({
      requestedByUserId: access.data.id,
      subject,
      message,
      ctaUrl,
      ctaLabel,
      requestedCount: uniqueTeamIds.length,
      sentCount: sent.length,
      skippedCount: skipped.length,
    });

    console.info("[AUDIT] super_admin_send_non_subscriber_campaign", {
      requestUserId: access.data.id,
      requested: uniqueTeamIds.length,
      sent: sent.length,
      skipped: skipped.length,
      at: new Date().toISOString(),
    });

    return {
      ok: true,
      data: {
        requested: uniqueTeamIds.length,
        sent,
        skipped,
      },
    };
  } catch (error) {
    console.error("Error preparing non-subscriber campaign:", error);
    return {
      ok: false,
      error: makeServiceError(
        502,
        ERROR_CODES.EMAIL_PROVIDER_ERROR,
        "Failed to send campaign via Resend"
      ),
    };
  }
}

export async function sendAdminClientEmail(params: {
  requestUserId: number | null;
  teamId: number;
  subject: string;
  message: string;
}): Promise<ServiceResult<{ teamId: number; email: string; emailId: string; lastEmailSentAt: string }>> {
  const access = await ensureSuperAdminAccess(params.requestUserId);
  if (!access.ok) {
    return access;
  }

  if (!Number.isInteger(params.teamId) || params.teamId < 1) {
    return { ok: false, error: validationServiceError("Valid teamId is required") };
  }

  const subject = params.subject.trim();
  const message = params.message.trim();
  if (!subject) {
    return { ok: false, error: validationServiceError("Subject is required") };
  }
  if (!message) {
    return { ok: false, error: validationServiceError("Message is required") };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    return {
      ok: false,
      error: makeServiceError(
        500,
        ERROR_CODES.EMAIL_NOT_CONFIGURED,
        "RESEND_API_KEY and RESEND_FROM_EMAIL must be configured"
      ),
    };
  }

  const teams = await getAdminTeamsByIds([params.teamId]);
  const team = teams[0];
  if (!team) {
    return {
      ok: false,
      error: makeServiceError(404, ERROR_CODES.TEAM_NOT_FOUND, "Team not found"),
    };
  }
  if (!team.ownerEmail) {
    return {
      ok: false,
      error: validationServiceError("Client has no email configured"),
    };
  }

  try {
    const emailId = await sendResendEmail({
      apiKey,
      from,
      to: team.ownerEmail,
      subject,
      html: buildCampaignHtml({
        teamName: team.companyName || team.name,
        message,
      }),
      text: message,
    });

    const lastEmailSentAt = await markAdminTeamEmailSent({
      teamId: team.id,
      updatedByUserId: access.data.id,
    });

    console.info("[AUDIT] super_admin_send_client_email", {
      requestUserId: access.data.id,
      teamId: team.id,
      email: team.ownerEmail,
      emailId,
      at: lastEmailSentAt.toISOString(),
    });

    return {
      ok: true,
      data: {
        teamId: team.id,
        email: team.ownerEmail,
        emailId,
        lastEmailSentAt: lastEmailSentAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("Error sending admin client email:", error);
    return { ok: false, error: mapAdminEmailProviderError(error) };
  }
}

export async function updateAdminTeamNote(params: {
  requestUserId: number | null;
  teamId: number;
  note: string | null;
}): Promise<ServiceResult<{ teamId: number; note: string | null }>> {
  const access = await ensureSuperAdminAccess(params.requestUserId);
  if (!access.ok) {
    return access;
  }

  if (!Number.isInteger(params.teamId) || params.teamId < 1) {
    return { ok: false, error: validationServiceError("Valid teamId is required") };
  }

  const teams = await getAdminTeamsByIds([params.teamId]);
  if (teams.length === 0) {
    return {
      ok: false,
      error: makeServiceError(404, ERROR_CODES.TEAM_NOT_FOUND, "Team not found"),
    };
  }

  const normalizedNote = params.note?.trim() || null;

  try {
    await upsertAdminTeamNote({
      teamId: params.teamId,
      note: normalizedNote,
      updatedByUserId: access.data.id,
    });

    console.info("[AUDIT] super_admin_update_team_note", {
      requestUserId: access.data.id,
      teamId: params.teamId,
      hasNote: !!normalizedNote,
      at: new Date().toISOString(),
    });

    return {
      ok: true,
      data: {
        teamId: params.teamId,
        note: normalizedNote,
      },
    };
  } catch (error) {
    console.error("Error updating admin team note:", error);
    return {
      ok: false,
      error: internalServiceError("An error occurred while updating the admin note"),
    };
  }
}

export async function updateAdminTeamPipelineStatus(params: {
  requestUserId: number | null;
  teamId: number;
  status: string;
}): Promise<ServiceResult<{ teamId: number; status: AdminPipelineStatus }>> {
  const access = await ensureSuperAdminAccess(params.requestUserId);
  if (!access.ok) {
    return access;
  }

  if (!Number.isInteger(params.teamId) || params.teamId < 1) {
    return { ok: false, error: validationServiceError("Valid teamId is required") };
  }

  if (!ADMIN_PIPELINE_STATUSES.includes(params.status as AdminPipelineStatus)) {
    return { ok: false, error: validationServiceError("Valid admin pipeline status is required") };
  }

  const teams = await getAdminTeamsByIds([params.teamId]);
  if (teams.length === 0) {
    return {
      ok: false,
      error: makeServiceError(404, ERROR_CODES.TEAM_NOT_FOUND, "Team not found"),
    };
  }

  const normalizedStatus = params.status as AdminPipelineStatus;

  try {
    await upsertAdminTeamPipelineStatus({
      teamId: params.teamId,
      status: normalizedStatus,
      updatedByUserId: access.data.id,
    });

    console.info("[AUDIT] super_admin_update_team_pipeline_status", {
      requestUserId: access.data.id,
      teamId: params.teamId,
      status: normalizedStatus,
      at: new Date().toISOString(),
    });

    return {
      ok: true,
      data: {
        teamId: params.teamId,
        status: normalizedStatus,
      },
    };
  } catch (error) {
    console.error("Error updating admin team pipeline status:", error);
    return {
      ok: false,
      error: internalServiceError("An error occurred while updating the admin pipeline status"),
    };
  }
}

export async function markAdminClientEmailSent(params: {
  requestUserId: number | null;
  teamId: number;
}): Promise<ServiceResult<{ teamId: number; lastEmailSentAt: string }>> {
  const access = await ensureSuperAdminAccess(params.requestUserId);
  if (!access.ok) {
    return access;
  }

  if (!Number.isInteger(params.teamId) || params.teamId < 1) {
    return { ok: false, error: validationServiceError("Valid teamId is required") };
  }

  const teams = await getAdminTeamsByIds([params.teamId]);
  if (teams.length === 0) {
    return {
      ok: false,
      error: makeServiceError(404, ERROR_CODES.TEAM_NOT_FOUND, "Team not found"),
    };
  }

  try {
    const lastEmailSentAt = await markAdminTeamEmailSent({
      teamId: params.teamId,
      updatedByUserId: access.data.id,
    });

    console.info("[AUDIT] super_admin_mark_client_email_sent", {
      requestUserId: access.data.id,
      teamId: params.teamId,
      at: lastEmailSentAt.toISOString(),
    });

    return {
      ok: true,
      data: {
        teamId: params.teamId,
        lastEmailSentAt: lastEmailSentAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("Error marking admin client email sent:", error);
    return {
      ok: false,
      error: internalServiceError("An error occurred while marking admin client email sent"),
    };
  }
}
