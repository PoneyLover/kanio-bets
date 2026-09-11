import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";

export const adminDashboardRouter = Router();

adminDashboardRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [
      usersCount,
      activeUsersCount,
      betsCount,
      wonBetsCount,
      lostBetsCount,
      pendingBetsCount,
      volumeAgg,
      eventsPendingSettlement,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.bet.count(),
      prisma.bet.count({ where: { status: "WON" } }),
      prisma.bet.count({ where: { status: "LOST" } }),
      prisma.bet.count({ where: { status: "PENDING" } }),
      prisma.bet.aggregate({ _sum: { stake: true } }),
      prisma.event.count({
        where: {
          settledAt: null,
          status: { in: ["OPEN", "SUSPENDED", "CLOSED", "FINISHED"] },
          startTime: { lt: new Date() },
        },
      }),
    ]);

    res.json({
      usersCount,
      activeUsersCount,
      betsCount,
      wonBetsCount,
      lostBetsCount,
      pendingBetsCount,
      totalKanioVolume: volumeAgg._sum.stake ?? 0,
      eventsPendingSettlement,
    });
  })
);
