import { Prisma } from "@kanio/db";
import { prisma, TX_OPTIONS } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { WalletService } from "../wallet/wallet.service";
import { OddsService } from "../odds/odds.service";
import type { PlaceBetInput } from "./bets.schemas";

const MIN_STAKE = 1;

export const BetsService = {
  /**
   * Place un pari simple (v1). L'architecture (Bet + BetSelection[]) permet
   * d'ajouter des paris combines plus tard sans migration : il suffirait de
   * creer plusieurs BetSelection pour un meme Bet et de multiplier les cotes
   * pour obtenir `totalOdds`.
   *
   * Toute l'operation est atomique : verification du marche, verrouillage du
   * solde utilisateur et des selections du marche, debit de la mise,
   * creation du ticket, mise a jour des mises cumulees et recalcul des cotes
   * se font dans UNE seule transaction Postgres. En cas d'echec (solde
   * insuffisant, marche ferme...), rien n'est persiste.
   */
  async placeBet(userId: string, input: PlaceBetInput) {
    if (input.stake < MIN_STAKE) {
      throw AppError.badRequest(`La mise minimale est de ${MIN_STAKE} KAN`);
    }

    return prisma.$transaction(async (tx) => {
      const selection = await tx.selection.findUnique({
        where: { id: input.selectionId },
        include: {
          market: { include: { event: { include: { homeParticipant: true, awayParticipant: true } } } },
        },
      });
      if (!selection) throw AppError.notFound("Selection introuvable");

      const { market } = selection;
      const { event } = market;

      if (market.status !== "OPEN") {
        throw AppError.conflict("Ce marche n'accepte plus de paris (suspendu ou ferme)");
      }
      if (event.status !== "OPEN") {
        throw AppError.conflict("Cet evenement n'accepte plus de paris");
      }

      // Verrouille toutes les selections du marche pour serialiser les
      // recalculs de cotes concurrents, puis relit la cote a jour.
      await OddsService.lockMarketSelections(tx, market.id);
      const freshSelection = await tx.selection.findUniqueOrThrow({ where: { id: selection.id } });

      const oddsTaken = freshSelection.currentOdds;
      const stake = new Prisma.Decimal(input.stake);
      const potentialPayout = stake.times(oddsTaken).toDecimalPlaces(2);

      const bet = await tx.bet.create({
        data: {
          userId,
          type: "SIMPLE",
          stake,
          totalOdds: oddsTaken,
          potentialPayout,
          status: "PENDING",
        },
      });

      await WalletService.applyTransaction(tx, {
        userId,
        type: "BET_PLACED",
        amount: stake,
        description: `Pari place : ${selection.label} (${market.name})`,
        referenceType: "BET",
        referenceId: bet.id,
      });

      await tx.betSelection.create({
        data: {
          betId: bet.id,
          selectionId: freshSelection.id,
          oddsTaken,
          selectionLabel: freshSelection.label,
          marketName: market.name,
          eventLabel: `${event.homeParticipant.name} vs ${event.awayParticipant.name}`,
        },
      });

      await tx.selection.update({
        where: { id: freshSelection.id },
        data: {
          totalStaked: { increment: stake },
          betCount: { increment: 1 },
        },
      });

      await OddsService.recalculateMarketOdds(tx, market.id, "BET_PLACED");

      return tx.bet.findUniqueOrThrow({
        where: { id: bet.id },
        include: { selections: true },
      });
    }, TX_OPTIONS);
  },

  /**
   * Flux public de tous les paris de tous les utilisateurs (nom d'utilisateur
   * + mise inclus), sans authentification requise. Meme logique de
   * transparence que le classement (`/api/leaderboard`), qui expose deja les
   * noms d'utilisateur publiquement.
   */
  async listPublicBets(filters: { eventId?: string; skip?: number; take?: number } = {}) {
    const bets = await prisma.bet.findMany({
      where: filters.eventId
        ? { selections: { some: { selection: { market: { eventId: filters.eventId } } } } }
        : undefined,
      include: { selections: true, user: { select: { username: true } } },
      orderBy: { placedAt: "desc" },
      skip: filters.skip ?? 0,
      take: Math.min(filters.take ?? 50, 100),
    });
    return bets.map(({ user, ...bet }) => ({ ...bet, username: user.username }));
  },

  async listUserBets(userId: string, filters: { status?: string; skip?: number; take?: number } = {}) {
    return prisma.bet.findMany({
      where: {
        userId,
        ...(filters.status ? { status: filters.status as never } : {}),
      },
      include: { selections: true },
      orderBy: { placedAt: "desc" },
      skip: filters.skip ?? 0,
      take: Math.min(filters.take ?? 50, 100),
    });
  },

  async getBetById(userId: string, betId: string, isAdmin: boolean) {
    const bet = await prisma.bet.findUnique({ where: { id: betId }, include: { selections: true } });
    if (!bet) throw AppError.notFound("Pari introuvable");
    if (bet.userId !== userId && !isAdmin) throw AppError.forbidden();
    return bet;
  },
};
