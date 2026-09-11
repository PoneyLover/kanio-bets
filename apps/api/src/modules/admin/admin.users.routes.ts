import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../utils/validate";
import { WalletService } from "../wallet/wallet.service";
import { toPublicUser } from "../auth/user.dto";
import { AuditService } from "./audit.service";
import { creditDebitSchema, suspendUserSchema } from "./admin.schemas";

export const adminUsersRouter = Router();

adminUsersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const users = await prisma.user.findMany({
      where: search
        ? {
            OR: [
              { username: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ users: users.map(toPublicUser) });
  })
);

adminUsersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw AppError.notFound("Utilisateur introuvable");
    const [transactions, bets] = await Promise.all([
      prisma.walletTransaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.bet.findMany({
        where: { userId: user.id },
        include: { selections: true },
        orderBy: { placedAt: "desc" },
        take: 50,
      }),
    ]);
    res.json({ user: toPublicUser(user), transactions, bets });
  })
);

adminUsersRouter.post(
  "/:id/suspend",
  validate(suspendUserSchema),
  asyncHandler(async (req, res) => {
    const targetId = req.params.id;
    const user = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { id: targetId } });
      if (!existing) throw AppError.notFound("Utilisateur introuvable");
      const updated = await tx.user.update({ where: { id: targetId }, data: { status: "SUSPENDED" } });
      await AuditService.logAction(tx, {
        adminId: req.user!.id,
        action: "USER_SUSPEND",
        targetType: "USER",
        targetId,
        reason: req.body.reason,
      });
      return updated;
    });
    res.json({ user: toPublicUser(user) });
  })
);

adminUsersRouter.post(
  "/:id/reactivate",
  asyncHandler(async (req, res) => {
    const targetId = req.params.id;
    const user = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { id: targetId } });
      if (!existing) throw AppError.notFound("Utilisateur introuvable");
      const updated = await tx.user.update({ where: { id: targetId }, data: { status: "ACTIVE" } });
      await AuditService.logAction(tx, {
        adminId: req.user!.id,
        action: "USER_REACTIVATE",
        targetType: "USER",
        targetId,
      });
      return updated;
    });
    res.json({ user: toPublicUser(user) });
  })
);

adminUsersRouter.post(
  "/:id/credit",
  validate(creditDebitSchema),
  asyncHandler(async (req, res) => {
    const targetId = req.params.id;
    const { amount, reason } = req.body;
    const transaction = await prisma.$transaction(async (tx) => {
      const walletTx = await WalletService.applyTransaction(tx, {
        userId: targetId,
        type: "ADMIN_CREDIT",
        amount,
        description: reason,
        referenceType: "ADMIN_ACTION",
        createdByAdminId: req.user!.id,
      });
      await AuditService.logAction(tx, {
        adminId: req.user!.id,
        action: "WALLET_CREDIT",
        targetType: "USER",
        targetId,
        reason,
        metadata: { amount },
      });
      return walletTx;
    });
    res.status(201).json({ transaction });
  })
);

adminUsersRouter.post(
  "/:id/debit",
  validate(creditDebitSchema),
  asyncHandler(async (req, res) => {
    const targetId = req.params.id;
    const { amount, reason } = req.body;
    const transaction = await prisma.$transaction(async (tx) => {
      const walletTx = await WalletService.applyTransaction(tx, {
        userId: targetId,
        type: "ADMIN_DEBIT",
        amount,
        description: reason,
        referenceType: "ADMIN_ACTION",
        createdByAdminId: req.user!.id,
      });
      await AuditService.logAction(tx, {
        adminId: req.user!.id,
        action: "WALLET_DEBIT",
        targetType: "USER",
        targetId,
        reason,
        metadata: { amount },
      });
      return walletTx;
    });
    res.status(201).json({ transaction });
  })
);
