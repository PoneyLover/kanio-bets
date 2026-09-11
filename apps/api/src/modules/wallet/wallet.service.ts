import { Prisma } from "@kanio/db";
import type { PrismaTransactionClient } from "../../types/prismaTx";
import { prisma } from "../../lib/prisma";
import { dbTable } from "../../lib/dbSchema";
import { AppError } from "../../utils/AppError";
import type { TransactionType } from "../../lib/prisma";

/**
 * WalletService - coeur du "ledger" KANIO.
 *
 * Regle absolue : on ne modifie JAMAIS `user.balanceCache` sans creer en meme
 * temps une ligne `WalletTransaction` dans LA MEME transaction Postgres, et on
 * ne cree jamais de ligne sans mettre a jour le cache. Les deux ecritures sont
 * atomiques (soit les deux reussissent, soit aucune).
 *
 * Concurrence : la ligne `users` est verrouillee via `SELECT ... FOR UPDATE`
 * avant lecture du solde, ce qui serialise les mouvements concurrents sur un
 * meme utilisateur (2 paris places en meme temps, etc.) et garantit qu'un
 * solde ne peut jamais devenir negatif.
 */

const CREDIT_TYPES: TransactionType[] = ["INITIAL_BALANCE", "BET_WIN", "BET_REFUND", "ADMIN_CREDIT", "BONUS"];
const DEBIT_TYPES: TransactionType[] = ["BET_PLACED", "ADMIN_DEBIT"];
// BET_LOSS est purement informatif : l'argent a deja quitte le solde au moment du BET_PLACED.
const INFORMATIONAL_TYPES: TransactionType[] = ["BET_LOSS"];

export interface ApplyTransactionParams {
  userId: string;
  type: TransactionType;
  amount: number | Prisma.Decimal;
  description: string;
  referenceType?: string;
  referenceId?: string;
  createdByAdminId?: string;
}

export const WalletService = {
  /**
   * Applique un mouvement de ledger. DOIT etre appele avec un client de
   * transaction Prisma (`tx`) ouvert par l'appelant, afin de pouvoir combiner
   * ce mouvement avec d'autres ecritures (placement de pari, settlement...)
   * dans une seule transaction atomique.
   */
  async applyTransaction(tx: PrismaTransactionClient, params: ApplyTransactionParams) {
    const amount = new Prisma.Decimal(params.amount);
    if (amount.lessThanOrEqualTo(0) && !INFORMATIONAL_TYPES.includes(params.type)) {
      throw AppError.badRequest("Le montant d'une transaction doit etre strictement positif");
    }

    // Verrouille la ligne utilisateur pour serialiser les mouvements concurrents.
    const locked = await tx.$queryRaw<Array<{ balance_cache: Prisma.Decimal }>>(
      Prisma.sql`SELECT balance_cache FROM ${dbTable("users")} WHERE id = ${params.userId} FOR UPDATE`
    );
    if (locked.length === 0) throw AppError.notFound("Utilisateur introuvable");

    const balanceBefore = new Prisma.Decimal(locked[0].balance_cache);

    let delta: Prisma.Decimal;
    if (CREDIT_TYPES.includes(params.type)) {
      delta = amount;
    } else if (DEBIT_TYPES.includes(params.type)) {
      delta = amount.negated();
    } else {
      delta = new Prisma.Decimal(0); // BET_LOSS : trace comptable sans mouvement
    }

    const balanceAfter = balanceBefore.plus(delta);
    if (balanceAfter.lessThan(0)) {
      throw AppError.insufficientFunds();
    }

    await tx.user.update({
      where: { id: params.userId },
      data: { balanceCache: balanceAfter },
    });

    return tx.walletTransaction.create({
      data: {
        userId: params.userId,
        type: params.type,
        amount,
        balanceBefore,
        balanceAfter,
        description: params.description,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        createdByAdminId: params.createdByAdminId,
      },
    });
  },

  async getBalance(userId: string): Promise<Prisma.Decimal> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { balanceCache: true } });
    if (!user) throw AppError.notFound("Utilisateur introuvable");
    return user.balanceCache;
  },

  async listTransactions(userId: string, { skip = 0, take = 50 }: { skip?: number; take?: number } = {}) {
    return prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  },

  /**
   * Recalcule le solde a partir de l'integralite du ledger (source de verite)
   * et le compare au cache. Outil de diagnostic / reconciliation admin.
   */
  async reconcileBalance(userId: string) {
    const lastTransaction = await prisma.walletTransaction.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound("Utilisateur introuvable");

    const ledgerBalance = lastTransaction?.balanceAfter ?? new Prisma.Decimal(0);
    const cacheBalance = user.balanceCache;
    return {
      cacheBalance,
      ledgerBalance,
      consistent: cacheBalance.equals(ledgerBalance),
    };
  },
};
