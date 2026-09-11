import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { LeaderboardService, type LeaderboardCriteria } from "./leaderboard.service";

export const leaderboardRouter = Router();

const VALID_CRITERIA: LeaderboardCriteria[] = ["balance", "profit", "wins", "roi"];

leaderboardRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const criteriaParam = typeof req.query.criteria === "string" ? req.query.criteria : "balance";
    const criteria = VALID_CRITERIA.includes(criteriaParam as LeaderboardCriteria)
      ? (criteriaParam as LeaderboardCriteria)
      : "balance";
    const limit = Math.min(Number(req.query.limit ?? 20), 100);
    const leaderboard = await LeaderboardService.getLeaderboard(criteria, limit);
    res.json({ criteria, leaderboard });
  })
);
