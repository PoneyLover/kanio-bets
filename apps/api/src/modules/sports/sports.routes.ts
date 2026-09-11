import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { DemoSportsDataProvider } from "./demoSportsDataProvider";

export const sportsRouter = Router();

sportsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const sports = await prisma.sport.findMany({
      include: { _count: { select: { competitions: true } } },
      orderBy: { name: "asc" },
    });
    res.json({ sports });
  })
);

/** Illustration du point d'extension SportsDataProvider (voir docs). */
sportsRouter.get(
  "/:sportKey/fixtures",
  asyncHandler(async (req, res) => {
    const fixtures = await DemoSportsDataProvider.listUpcomingFixtures(req.params.sportKey);
    res.json({ fixtures });
  })
);
