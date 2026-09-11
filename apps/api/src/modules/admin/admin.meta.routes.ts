import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../utils/validate";
import { createCompetitionSchema, createParticipantSchema } from "./admin.schemas";

/** Petites listes utilitaires pour construire les formulaires admin (creation d'evenement...). */
export const adminMetaRouter = Router();

adminMetaRouter.get(
  "/options",
  asyncHandler(async (_req, res) => {
    const [competitions, participants, sports] = await Promise.all([
      prisma.competition.findMany({ include: { sport: true }, orderBy: { name: "asc" } }),
      prisma.participant.findMany({ orderBy: { name: "asc" } }),
      prisma.sport.findMany({ orderBy: { name: "asc" } }),
    ]);
    res.json({ competitions, participants, sports });
  })
);

adminMetaRouter.post(
  "/participants",
  validate(createParticipantSchema),
  asyncHandler(async (req, res) => {
    const participant = await prisma.participant.create({ data: req.body });
    res.status(201).json({ participant });
  })
);

adminMetaRouter.post(
  "/competitions",
  validate(createCompetitionSchema),
  asyncHandler(async (req, res) => {
    const competition = await prisma.competition.create({ data: req.body });
    res.status(201).json({ competition });
  })
);
