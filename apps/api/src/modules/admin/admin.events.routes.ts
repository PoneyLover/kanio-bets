import { Router } from "express";
import { Prisma } from "@kanio/db";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../utils/validate";
import { OddsService } from "../odds/odds.service";
import { SettlementService } from "../settlement/settlement.service";
import { AuditService } from "./audit.service";
import {
  cancelEventSchema,
  createEventSchema,
  createMarketSchema,
  settleEventSchema,
  updateEventSchema,
  updateMarketStatusSchema,
} from "./admin.schemas";

export const adminEventsRouter = Router();

adminEventsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const events = await prisma.event.findMany({
      include: {
        competition: { include: { sport: true } },
        homeParticipant: true,
        awayParticipant: true,
        markets: { include: { selections: true } },
      },
      orderBy: { startTime: "desc" },
      take: 200,
    });
    res.json({ events });
  })
);

adminEventsRouter.post(
  "/",
  validate(createEventSchema),
  asyncHandler(async (req, res) => {
    const event = await prisma.$transaction(async (tx) => {
      const created = await tx.event.create({
        data: {
          competitionId: req.body.competitionId,
          homeParticipantId: req.body.homeParticipantId,
          awayParticipantId: req.body.awayParticipantId,
          startTime: new Date(req.body.startTime),
          status: "SCHEDULED",
        },
      });
      await AuditService.logAction(tx, {
        adminId: req.user!.id,
        action: "EVENT_CREATE",
        targetType: "EVENT",
        targetId: created.id,
      });
      return created;
    });
    res.status(201).json({ event });
  })
);

adminEventsRouter.put(
  "/:id",
  validate(updateEventSchema),
  asyncHandler(async (req, res) => {
    const eventId = req.params.id;
    const event = await prisma.$transaction(async (tx) => {
      const existing = await tx.event.findUnique({ where: { id: eventId } });
      if (!existing) throw AppError.notFound("Evenement introuvable");
      const updated = await tx.event.update({
        where: { id: eventId },
        data: {
          ...(req.body.startTime ? { startTime: new Date(req.body.startTime) } : {}),
          ...(req.body.status ? { status: req.body.status } : {}),
        },
      });
      await AuditService.logAction(tx, {
        adminId: req.user!.id,
        action: "EVENT_UPDATE",
        targetType: "EVENT",
        targetId: eventId,
        metadata: req.body,
      });
      return updated;
    });
    res.json({ event });
  })
);

function transitionEventStatus(action: "OPEN" | "SUSPEND" | "CLOSE") {
  const statusByAction = { OPEN: "OPEN", SUSPEND: "SUSPENDED", CLOSE: "CLOSED" } as const;
  const auditByAction = { OPEN: "EVENT_OPEN", SUSPEND: "EVENT_SUSPEND", CLOSE: "EVENT_CLOSE" } as const;

  return asyncHandler(async (req, res) => {
    const eventId = req.params.id;
    const event = await prisma.$transaction(async (tx) => {
      const existing = await tx.event.findUnique({ where: { id: eventId } });
      if (!existing) throw AppError.notFound("Evenement introuvable");
      if (existing.status === "CANCELLED" || existing.status === "FINISHED") {
        throw AppError.conflict(`Impossible de changer le statut d'un evenement ${existing.status}`);
      }
      const updated = await tx.event.update({ where: { id: eventId }, data: { status: statusByAction[action] } });
      await AuditService.logAction(tx, {
        adminId: req.user!.id,
        action: auditByAction[action],
        targetType: "EVENT",
        targetId: eventId,
      });
      return updated;
    });
    res.json({ event });
  });
}

adminEventsRouter.post("/:id/open", transitionEventStatus("OPEN"));
adminEventsRouter.post("/:id/suspend", transitionEventStatus("SUSPEND"));
adminEventsRouter.post("/:id/close", transitionEventStatus("CLOSE"));

adminEventsRouter.post(
  "/:id/settle",
  validate(settleEventSchema),
  asyncHandler(async (req, res) => {
    const result = await SettlementService.settleEvent(req.user!.id, req.params.id, req.body);
    res.json(result);
  })
);

adminEventsRouter.post(
  "/:id/cancel",
  validate(cancelEventSchema),
  asyncHandler(async (req, res) => {
    const result = await SettlementService.cancelEvent(req.user!.id, req.params.id, req.body.reason);
    res.json(result);
  })
);

adminEventsRouter.post(
  "/:id/markets",
  validate(createMarketSchema),
  asyncHandler(async (req, res) => {
    const eventId = req.params.id;
    const market = await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({ where: { id: eventId } });
      if (!event) throw AppError.notFound("Evenement introuvable");

      const createdMarket = await tx.market.create({
        data: {
          eventId,
          type: req.body.type,
          name: req.body.name,
          line: req.body.line !== undefined ? new Prisma.Decimal(req.body.line) : null,
          status: "OPEN",
        },
      });

      for (const s of req.body.selections as Array<{
        label: string;
        outcomeKey: string;
        odds: number;
        minOdds?: number;
        maxOdds?: number;
      }>) {
        const selection = await tx.selection.create({
          data: {
            marketId: createdMarket.id,
            label: s.label,
            outcomeKey: s.outcomeKey,
            currentOdds: new Prisma.Decimal(s.odds),
            minOdds: new Prisma.Decimal(s.minOdds ?? 1.05),
            maxOdds: new Prisma.Decimal(s.maxOdds ?? 15),
          },
        });
        await OddsService.recordInitialOdds(tx, selection.id, s.odds);
      }

      await AuditService.logAction(tx, {
        adminId: req.user!.id,
        action: "MARKET_CREATE",
        targetType: "MARKET",
        targetId: createdMarket.id,
        metadata: { eventId, type: req.body.type },
      });

      return tx.market.findUniqueOrThrow({ where: { id: createdMarket.id }, include: { selections: true } });
    });
    res.status(201).json({ market });
  })
);

export const adminMarketsRouter = Router();

adminMarketsRouter.put(
  "/:marketId/status",
  validate(updateMarketStatusSchema),
  asyncHandler(async (req, res) => {
    const marketId = req.params.marketId;
    const market = await prisma.$transaction(async (tx) => {
      const existing = await tx.market.findUnique({ where: { id: marketId } });
      if (!existing) throw AppError.notFound("Marche introuvable");
      if (existing.status === "SETTLED" || existing.status === "CANCELLED") {
        throw AppError.conflict(`Impossible de modifier un marche ${existing.status}`);
      }
      const updated = await tx.market.update({ where: { id: marketId }, data: { status: req.body.status } });
      await AuditService.logAction(tx, {
        adminId: req.user!.id,
        action: req.body.status === "SUSPENDED" ? "MARKET_SUSPEND" : "MARKET_UPDATE",
        targetType: "MARKET",
        targetId: marketId,
        metadata: { status: req.body.status },
      });
      return updated;
    });
    res.json({ market });
  })
);
