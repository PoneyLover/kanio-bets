import { prisma } from "../../lib/prisma";

export type LeaderboardCriteria = "balance" | "profit" | "wins" | "roi";

/**
 * Nombre minimum de paris regles pour apparaitre dans les classements
 * "profit" et "roi" - protection contre les incoherences statistiques
 * (un utilisateur avec 1 seul pari gagnant afficherait un ROI de +infini%).
 */
const MIN_SETTLED_BETS_FOR_ROI = 3;

export const LeaderboardService = {
  async getLeaderboard(criteria: LeaderboardCriteria, limit = 20) {
    if (criteria === "balance") {
      const users = await prisma.user.findMany({
        where: { status: "ACTIVE" },
        orderBy: { balanceCache: "desc" },
        take: limit,
        select: { id: true, username: true, balanceCache: true },
      });
      return users.map((u) => ({ userId: u.id, username: u.username, balance: u.balanceCache }));
    }

    // Agregation des paris regles (WON/LOST) par utilisateur.
    const stats = await prisma.bet.groupBy({
      by: ["userId"],
      where: { status: { in: ["WON", "LOST"] } },
      _sum: { stake: true, payoutAmount: true },
      _count: { _all: true },
    });

    const winCounts = await prisma.bet.groupBy({
      by: ["userId"],
      where: { status: "WON" },
      _count: { _all: true },
    });
    const winCountByUser = new Map(winCounts.map((w) => [w.userId, w._count._all]));

    const users = await prisma.user.findMany({
      where: { id: { in: stats.map((s) => s.userId) }, status: "ACTIVE" },
      select: { id: true, username: true },
    });
    const usernameById = new Map(users.map((u) => [u.id, u.username]));

    let rows = stats
      .filter((s) => usernameById.has(s.userId))
      .map((s) => {
        const totalStaked = s._sum.stake?.toNumber() ?? 0;
        const totalPayout = s._sum.payoutAmount?.toNumber() ?? 0;
        const netProfit = totalPayout - totalStaked;
        const settledCount = s._count._all;
        const wins = winCountByUser.get(s.userId) ?? 0;
        const roi = totalStaked > 0 ? netProfit / totalStaked : null;
        return {
          userId: s.userId,
          username: usernameById.get(s.userId)!,
          settledBets: settledCount,
          wins,
          netProfit,
          roi,
        };
      });

    if (criteria === "wins") {
      rows.sort((a, b) => b.wins - a.wins);
    } else if (criteria === "profit") {
      rows.sort((a, b) => b.netProfit - a.netProfit);
    } else if (criteria === "roi") {
      // Protection : exclut les echantillons trop petits pour etre significatifs.
      rows = rows.filter((r) => r.settledBets >= MIN_SETTLED_BETS_FOR_ROI && r.roi !== null);
      rows.sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0));
    }

    return rows.slice(0, limit);
  },
};
