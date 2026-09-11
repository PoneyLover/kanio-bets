import { prisma } from "../../src/lib/prisma";

/**
 * Vide toutes les tables applicatives, dans un ordre compatible avec les FK.
 * Garde-fou defensif : on a deja ete mordu une fois par une mauvaise
 * configuration d'environnement qui a fait tourner les tests contre la base
 * de DEV - cette verification est volontairement redondante avec celle de
 * vitest.config.ts / tests/setup.ts.
 */
export async function resetDb() {
  if (!process.env.DATABASE_URL?.includes("test")) {
    throw new Error("resetDb() refuse de s'executer : DATABASE_URL ne ressemble pas a une base de test.");
  }
  await prisma.auditLog.deleteMany();
  await prisma.betSelection.deleteMany();
  await prisma.bet.deleteMany();
  await prisma.oddsHistory.deleteMany();
  await prisma.selection.deleteMany();
  await prisma.market.deleteMany();
  await prisma.event.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.competition.deleteMany();
  await prisma.sport.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
}
