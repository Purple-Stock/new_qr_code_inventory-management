import { and, count, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import { sqlite } from "@/db/client";
import { companies, items, stockTransactions, teamMembers, teams } from "@/db/schema";

type TeamRow = {
  team: typeof teams.$inferSelect;
  companyName: string | null;
};

function buildSearchCondition(search: string | undefined): SQL | undefined {
  const normalized = search?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  const pattern = `%${normalized}%`;
  return or(
    sql`lower(${teams.name}) like ${pattern}`,
    sql`lower(coalesce(${companies.name}, '')) like ${pattern}`
  );
}

export async function getAdminTeamsWithStats(params: {
  page: number;
  pageSize: number;
  search?: string;
}) {
  const offset = (params.page - 1) * params.pageSize;
  const searchCondition = buildSearchCondition(params.search);

  const baseQuery = sqlite
    .select({
      team: teams,
      companyName: companies.name,
    })
    .from(teams)
    .leftJoin(companies, eq(teams.companyId, companies.id));

  const rows: TeamRow[] = searchCondition
    ? await baseQuery
        .where(searchCondition)
        .orderBy(desc(teams.createdAt))
        .limit(params.pageSize)
        .offset(offset)
    : await baseQuery.orderBy(desc(teams.createdAt)).limit(params.pageSize).offset(offset);

  const countQuery = sqlite.select({ count: count() }).from(teams).leftJoin(companies, eq(teams.companyId, companies.id));
  const [countRow] = searchCondition
    ? await countQuery.where(searchCondition)
    : await countQuery;

  const teamIds = rows.map((row) => row.team.id);
  if (teamIds.length === 0) {
    return { teams: [], total: countRow?.count ?? 0 };
  }

  const [itemCounts, transactionCounts, memberCounts] = await Promise.all([
    sqlite
      .select({ teamId: items.teamId, count: count() })
      .from(items)
      .where(inArray(items.teamId, teamIds))
      .groupBy(items.teamId),
    sqlite
      .select({ teamId: stockTransactions.teamId, count: count() })
      .from(stockTransactions)
      .where(inArray(stockTransactions.teamId, teamIds))
      .groupBy(stockTransactions.teamId),
    sqlite
      .select({ teamId: teamMembers.teamId, count: count() })
      .from(teamMembers)
      .where(and(inArray(teamMembers.teamId, teamIds), eq(teamMembers.status, "active")))
      .groupBy(teamMembers.teamId),
  ]);

  const itemCountByTeam = new Map(itemCounts.map((row) => [row.teamId, row.count]));
  const transactionCountByTeam = new Map(
    transactionCounts.map((row) => [row.teamId, row.count])
  );
  const memberCountByTeam = new Map(memberCounts.map((row) => [row.teamId, row.count]));

  return {
    teams: rows.map((row) => ({
      ...row.team,
      companyName: row.companyName ?? null,
      itemCount: itemCountByTeam.get(row.team.id) || 0,
      transactionCount: transactionCountByTeam.get(row.team.id) || 0,
      memberCount: memberCountByTeam.get(row.team.id) || 0,
      teamRole: "admin",
      canDeleteTeam: true,
    })),
    total: countRow?.count ?? 0,
  };
}
