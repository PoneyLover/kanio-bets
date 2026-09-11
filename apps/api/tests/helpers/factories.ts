import { prisma } from "../../src/lib/prisma";
import { hashPassword } from "../../src/utils/password";
import type { UserRole } from "../../src/lib/prisma";

export async function createUser(opts: {
  username: string;
  email: string;
  password?: string;
  role?: UserRole;
  balance?: number;
}) {
  const passwordHash = await hashPassword(opts.password ?? "Passw0rd!");
  const balance = opts.balance ?? 1000;
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username: opts.username,
        email: opts.email,
        passwordHash,
        role: opts.role ?? "USER",
        balanceCache: balance,
      },
    });
    await tx.walletTransaction.create({
      data: {
        userId: user.id,
        type: "INITIAL_BALANCE",
        amount: balance,
        balanceBefore: 0,
        balanceAfter: balance,
        description: "Solde initial (fixture de test)",
      },
    });
    return user;
  });
}

/** Cree un evenement OPEN avec un marche MATCH_WINNER a 3 selections (HOME/DRAW/AWAY). */
export async function createOpenMatchWinnerEvent(oddsHome = 2, oddsDraw = 3, oddsAway = 4) {
  const sport = await prisma.sport.create({ data: { key: `sport-${Date.now()}-${Math.random()}`, name: "Football Test" } });
  const competition = await prisma.competition.create({ data: { sportId: sport.id, name: "Ligue Test" } });
  const home = await prisma.participant.create({ data: { name: "Home FC" } });
  const away = await prisma.participant.create({ data: { name: "Away FC" } });

  const event = await prisma.event.create({
    data: {
      competitionId: competition.id,
      homeParticipantId: home.id,
      awayParticipantId: away.id,
      startTime: new Date(Date.now() + 1000 * 60 * 60),
      status: "OPEN",
    },
  });

  const market = await prisma.market.create({
    data: { eventId: event.id, type: "MATCH_WINNER", name: "Vainqueur du match", status: "OPEN" },
  });

  const [homeSel, drawSel, awaySel] = await Promise.all([
    prisma.selection.create({
      data: { marketId: market.id, label: "Home FC", outcomeKey: "HOME", currentOdds: oddsHome, minOdds: 1.05, maxOdds: 15 },
    }),
    prisma.selection.create({
      data: { marketId: market.id, label: "Nul", outcomeKey: "DRAW", currentOdds: oddsDraw, minOdds: 1.05, maxOdds: 15 },
    }),
    prisma.selection.create({
      data: { marketId: market.id, label: "Away FC", outcomeKey: "AWAY", currentOdds: oddsAway, minOdds: 1.05, maxOdds: 15 },
    }),
  ]);

  return { event, market, homeSel, drawSel, awaySel };
}
