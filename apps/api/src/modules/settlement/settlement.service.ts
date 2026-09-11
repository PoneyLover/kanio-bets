import { Prisma } from "@kanio/db";
import type { PrismaTransactionClient } from "../../types/prismaTx";
import { prisma, TX_OPTIONS } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { WalletService } from "../wallet/wallet.service";
import { AuditService } from "../admin/audit.service";
import { resolveOutcome, type MatchResultPayload } from "./resultResolvers";

/**
 * Regle tous les paris PENDING dont TOUTES les selections ont desormais un
 * resultat non-PENDING. Pour un pari simple (v1), une seule selection suffit.
 * Pour un futur pari combine, le pari n'est finalise que lorsque toutes ses
 * jambes sont resolues (les autres evenements du combine peuvent se terminer
 * a des dates differentes).
 */
async function finalizeBetsForSelections(tx: PrismaTransactionClient, selectionIds: string[]) {
  const affectedBets = await tx.bet.findMany({
    where: { status: "PENDING", selections: { some: { selectionId: { in: selectionIds } } } },
    include: { selections: { include: { selection: true } } },
  });

  let wonCount = 0;
  let lostCount = 0;
  let refundedCount = 0;
  let totalPaidOut = new Prisma.Decimal(0);

  for (const bet of affectedBets) {
    const allResolved = bet.selections.every((bs) => bs.selection.result !== "PENDING");
    if (!allResolved) continue;

    for (const bs of bet.selections) {
      if (bs.result === "PENDING") {
        await tx.betSelection.update({ where: { id: bs.id }, data: { result: bs.selection.result } });
      }
    }

    const results = bet.selections.map((bs) => bs.selection.result);
    const hasLost = results.includes("LOST");
    const allVoid = results.every((r) => r === "VOID");

    if (hasLost) {
      lostCount++;
      await WalletService.applyTransaction(tx, {
        userId: bet.userId,
        type: "BET_LOSS",
        amount: bet.stake,
        description: `Pari perdu (ticket ${bet.id})`,
        referenceType: "BET",
        referenceId: bet.id,
      });
      await tx.bet.update({ where: { id: bet.id }, data: { status: "LOST", payoutAmount: 0, settledAt: new Date() } });
    } else if (allVoid) {
      refundedCount++;
      await WalletService.applyTransaction(tx, {
        userId: bet.userId,
        type: "BET_REFUND",
        amount: bet.stake,
        description: `Pari rembourse - marche annule (ticket ${bet.id})`,
        referenceType: "BET",
        referenceId: bet.id,
      });
      await tx.bet.update({
        where: { id: bet.id },
        data: { status: "REFUNDED", payoutAmount: bet.stake, settledAt: new Date() },
      });
    } else {
      wonCount++;
      totalPaidOut = totalPaidOut.plus(bet.potentialPayout);
      await WalletService.applyTransaction(tx, {
        userId: bet.userId,
        type: "BET_WIN",
        amount: bet.potentialPayout,
        description: `Pari gagnant (ticket ${bet.id})`,
        referenceType: "BET",
        referenceId: bet.id,
      });
      await tx.bet.update({
        where: { id: bet.id },
        data: { status: "WON", payoutAmount: bet.potentialPayout, settledAt: new Date() },
      });
    }
  }

  return { wonCount, lostCount, refundedCount, totalPaidOut };
}

export const SettlementService = {
  /**
   * Regle un evenement : saisie du resultat, resolution de tous les marches
   * non deja regles, creditation des gains. Idempotent : un evenement deja
   * regle (`settledAt` non nul) ou annule ne peut pas etre regle a nouveau.
   */
  async settleEvent(adminId: string, eventId: string, result: MatchResultPayload) {
    return prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id: eventId },
        include: { markets: { include: { selections: true } } },
      });
      if (!event) throw AppError.notFound("Evenement introuvable");
      if (event.status === "CANCELLED") throw AppError.conflict("Evenement annule, impossible a regler");
      if (event.settledAt) throw AppError.conflict("Evenement deja regle (settlement idempotent)");

      const settlableMarkets = event.markets.filter((m) => m.status !== "SETTLED" && m.status !== "CANCELLED");
      const allSelectionIds: string[] = [];

      for (const market of settlableMarkets) {
        const line = market.line ? market.line.toNumber() : null;
        for (const selection of market.selections) {
          const outcome = resolveOutcome(market.type, selection.outcomeKey, result, line);
          await tx.selection.update({
            where: { id: selection.id },
            data: { result: outcome, resultSetAt: new Date() },
          });
          allSelectionIds.push(selection.id);
        }
        await tx.market.update({ where: { id: market.id }, data: { status: "SETTLED", settledAt: new Date() } });
      }

      await tx.event.update({
        where: { id: eventId },
        data: { status: "FINISHED", resultPayload: result as never, settledAt: new Date() },
      });

      const summary = await finalizeBetsForSelections(tx, allSelectionIds);

      await AuditService.logAction(tx, {
        adminId,
        action: "EVENT_SETTLE",
        targetType: "EVENT",
        targetId: eventId,
        metadata: { result, ...summary, totalPaidOut: summary.totalPaidOut.toString() },
      });

      return { event: await tx.event.findUniqueOrThrow({ where: { id: eventId } }), ...summary };
    }, TX_OPTIONS);
  },

  /**
   * Annule un evenement : tous les marches et selections passent VOID, tous
   * les paris PENDING lies sont integralement rembourses (BET_REFUND).
   */
  async cancelEvent(adminId: string, eventId: string, reason: string) {
    return prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id: eventId },
        include: { markets: { include: { selections: true } } },
      });
      if (!event) throw AppError.notFound("Evenement introuvable");
      if (event.status === "CANCELLED") throw AppError.conflict("Evenement deja annule (idempotent)");
      if (event.settledAt) throw AppError.conflict("Evenement deja regle, impossible a annuler");

      const allSelectionIds: string[] = [];
      for (const market of event.markets) {
        for (const selection of market.selections) {
          await tx.selection.update({ where: { id: selection.id }, data: { result: "VOID", resultSetAt: new Date() } });
          allSelectionIds.push(selection.id);
        }
        await tx.market.update({ where: { id: market.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
      }

      await tx.event.update({ where: { id: eventId }, data: { status: "CANCELLED", cancelledAt: new Date() } });

      const summary = await finalizeBetsForSelections(tx, allSelectionIds);

      await AuditService.logAction(tx, {
        adminId,
        action: "EVENT_CANCEL",
        targetType: "EVENT",
        targetId: eventId,
        reason,
        metadata: { ...summary, totalPaidOut: summary.totalPaidOut.toString() },
      });

      return { event: await tx.event.findUniqueOrThrow({ where: { id: eventId } }), ...summary };
    }, TX_OPTIONS);
  },
};
