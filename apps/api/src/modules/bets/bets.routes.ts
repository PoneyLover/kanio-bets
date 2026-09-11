import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { betRateLimit } from "../../middleware/rateLimit";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../utils/validate";
import { BetsService } from "./bets.service";
import { placeBetSchema } from "./bets.schemas";

export const betsRouter = Router();

betsRouter.use(requireAuth);

betsRouter.post(
  "/",
  betRateLimit,
  validate(placeBetSchema),
  asyncHandler(async (req, res) => {
    const bet = await BetsService.placeBet(req.user!.id, req.body);
    res.status(201).json({ bet });
  })
);

betsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const skip = Number(req.query.skip ?? 0);
    const take = Number(req.query.take ?? 50);
    const bets = await BetsService.listUserBets(req.user!.id, { status, skip, take });
    res.json({ bets });
  })
);

betsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const bet = await BetsService.getBetById(req.user!.id, req.params.id, req.user!.role === "ADMIN");
    res.json({ bet });
  })
);
