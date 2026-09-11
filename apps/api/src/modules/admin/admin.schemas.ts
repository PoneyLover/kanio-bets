import { z } from "zod";

export const creditDebitSchema = z.object({
  amount: z.number().positive("Le montant doit etre positif").max(1_000_000),
  reason: z.string().min(5, "Une justification d'au moins 5 caracteres est obligatoire").max(500),
});

export const createEventSchema = z.object({
  competitionId: z.string().uuid(),
  homeParticipantId: z.string().uuid(),
  awayParticipantId: z.string().uuid(),
  startTime: z.string().datetime(),
});

export const updateEventSchema = z.object({
  startTime: z.string().datetime().optional(),
  status: z.enum(["SCHEDULED", "OPEN", "SUSPENDED", "CLOSED"]).optional(),
});

export const settleEventSchema = z.object({
  homeScore: z.number().int().min(0).max(200),
  awayScore: z.number().int().min(0).max(200),
});

export const cancelEventSchema = z.object({
  reason: z.string().min(5, "Une justification d'au moins 5 caracteres est obligatoire").max(500),
});

const selectionInputSchema = z.object({
  label: z.string().min(1).max(80),
  outcomeKey: z.string().min(1).max(40),
  odds: z.number().min(1.01).max(1000),
  minOdds: z.number().min(1.01).max(1000).optional(),
  maxOdds: z.number().min(1.01).max(1000).optional(),
});

export const createMarketSchema = z
  .object({
    type: z.enum(["MATCH_WINNER", "OVER_UNDER", "CORRECT_SCORE", "HANDICAP"]),
    name: z.string().min(1).max(120),
    line: z.number().optional(),
    selections: z.array(selectionInputSchema).min(2).max(12),
  })
  .refine((v) => v.selections.every((s) => (s.minOdds ?? 1.01) <= s.odds && s.odds <= (s.maxOdds ?? 1000)), {
    message: "La cote initiale doit etre comprise entre minOdds et maxOdds",
  });

export const updateMarketStatusSchema = z.object({
  status: z.enum(["OPEN", "SUSPENDED", "CLOSED"]),
});

export const createSportSchema = z.object({
  name: z.string().min(1).max(60),
  key: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Minuscules, chiffres et tirets uniquement")
    .optional(),
});

export const createParticipantSchema = z.object({
  name: z.string().min(1).max(80),
  shortName: z.string().max(20).optional(),
});

export const createCompetitionSchema = z.object({
  sportId: z.string().uuid(),
  name: z.string().min(1).max(120),
  country: z.string().max(60).optional(),
});

export const suspendUserSchema = z.object({
  reason: z.string().min(5, "Une justification d'au moins 5 caracteres est obligatoire").max(500),
});
