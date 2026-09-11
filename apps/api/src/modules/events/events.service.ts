import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

const eventInclude = {
  competition: { include: { sport: true } },
  homeParticipant: true,
  awayParticipant: true,
  markets: {
    include: { selections: true },
  },
} as const;

export const EventsService = {
  async listEvents(filters: { sportKey?: string; status?: string }) {
    return prisma.event.findMany({
      where: {
        ...(filters.sportKey ? { competition: { sport: { key: filters.sportKey } } } : {}),
        ...(filters.status ? { status: filters.status as never } : { status: { notIn: ["CANCELLED"] } }),
      },
      include: eventInclude,
      orderBy: { startTime: "asc" },
    });
  },

  async getEventById(id: string) {
    const event = await prisma.event.findUnique({ where: { id }, include: eventInclude });
    if (!event) throw AppError.notFound("Evenement introuvable");
    return event;
  },
};
