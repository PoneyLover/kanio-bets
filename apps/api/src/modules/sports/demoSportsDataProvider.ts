import { prisma } from "../../lib/prisma";
import type { FixtureDTO, ResultDTO, SportsDataProvider } from "./sportsDataProvider";

/**
 * Implementation de demonstration : les "fixtures" sont simplement les
 * evenements deja presents en base (crees par le seed ou l'ecran admin),
 * exposees au format DTO generique de `SportsDataProvider`. Ne depend
 * d'aucune API externe payante, conformement au cahier des charges v1.
 */
export const DemoSportsDataProvider: SportsDataProvider = {
  async listUpcomingFixtures(sportKey: string): Promise<FixtureDTO[]> {
    const events = await prisma.event.findMany({
      where: {
        status: { in: ["SCHEDULED", "OPEN"] },
        competition: { sport: { key: sportKey } },
      },
      include: { competition: true, homeParticipant: true, awayParticipant: true },
      orderBy: { startTime: "asc" },
    });

    return events.map((e) => ({
      externalId: e.id,
      sportKey,
      competitionName: e.competition.name,
      homeTeam: e.homeParticipant.name,
      awayTeam: e.awayParticipant.name,
      startTime: e.startTime.toISOString(),
    }));
  },

  async getResult(externalId: string): Promise<ResultDTO | null> {
    const event = await prisma.event.findUnique({ where: { id: externalId } });
    if (!event || !event.resultPayload) return null;
    const payload = event.resultPayload as { homeScore: number; awayScore: number };
    return {
      externalId,
      homeScore: payload.homeScore,
      awayScore: payload.awayScore,
      finishedAt: (event.settledAt ?? event.updatedAt).toISOString(),
    };
  },
};
