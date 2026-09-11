import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { WalletService } from "./wallet.service";

export const walletRouter = Router();

walletRouter.use(requireAuth);

walletRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const balance = await WalletService.getBalance(req.user!.id);
    res.json({ balance, currency: "KAN" });
  })
);

walletRouter.get(
  "/transactions",
  asyncHandler(async (req, res) => {
    const skip = Number(req.query.skip ?? 0);
    const take = Math.min(Number(req.query.take ?? 50), 100);
    const transactions = await WalletService.listTransactions(req.user!.id, { skip, take });
    res.json({ transactions });
  })
);
