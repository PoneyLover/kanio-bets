import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../utils/validate";
import { createCompetitionSchema, createParticipantSchema, createSportSchema } from "./admin.schemas";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // retire les accents (diacritiques Unicode, ex: "e" -> "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
  "/sports",
  validate(createSportSchema),
  asyncHandler(async (req, res) => {
    const name: string = req.body.name;
    const requestedKey: string | undefined = req.body.key;
    const baseKey = requestedKey ?? slugify(name);
    if (!baseKey) throw AppError.badRequest("Impossible de deriver une cle a partir de ce nom");

    // Garantit l'unicite de la cle sans faire echouer la creation sur une collision de nom.
    let key = baseKey;
    let suffix = 2;
    while (await prisma.sport.findUnique({ where: { key } })) {
      key = `${baseKey}-${suffix}`;
      suffix += 1;
    }

    const sport = await prisma.sport.create({ data: { key, name } });
    res.status(201).json({ sport });
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
