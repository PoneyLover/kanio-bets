import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { WalletService } from "../../src/modules/wallet/wallet.service";
import { resetDb } from "../helpers/db";
import { createUser } from "../helpers/factories";

describe("WalletService.applyTransaction", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("credite le solde et enregistre une transaction avec balanceBefore/balanceAfter corrects", async () => {
    const user = await createUser({ username: "alice", email: "alice@test.local", balance: 100 });

    const tx = await prisma.$transaction((t) =>
      WalletService.applyTransaction(t, {
        userId: user.id,
        type: "ADMIN_CREDIT",
        amount: 50,
        description: "bonus test",
      })
    );

    expect(tx.balanceBefore.toNumber()).toBe(100);
    expect(tx.balanceAfter.toNumber()).toBe(150);

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.balanceCache.toNumber()).toBe(150);
  });

  it("debite le solde quand les fonds sont suffisants", async () => {
    const user = await createUser({ username: "bob", email: "bob@test.local", balance: 100 });

    await prisma.$transaction((t) =>
      WalletService.applyTransaction(t, { userId: user.id, type: "BET_PLACED", amount: 40, description: "pari" })
    );

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.balanceCache.toNumber()).toBe(60);
  });

  it("refuse un debit qui rendrait le solde negatif, et ne persiste aucun changement", async () => {
    const user = await createUser({ username: "carol", email: "carol@test.local", balance: 30 });

    await expect(
      prisma.$transaction((t) =>
        WalletService.applyTransaction(t, { userId: user.id, type: "BET_PLACED", amount: 31, description: "pari trop gros" })
      )
    ).rejects.toThrow();

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.balanceCache.toNumber()).toBe(30);
    const txCount = await prisma.walletTransaction.count({ where: { userId: user.id } });
    expect(txCount).toBe(1); // uniquement le INITIAL_BALANCE de la fixture
  });

  it("ne permet jamais un solde negatif sous deux debits concurrents", async () => {
    const user = await createUser({ username: "dave", email: "dave@test.local", balance: 100 });

    const attempt = (amount: number) =>
      prisma.$transaction((t) =>
        WalletService.applyTransaction(t, { userId: user.id, type: "BET_PLACED", amount, description: "pari concurrent" })
      );

    // Deux debits de 70 KAN en parallele sur un solde de 100 : un seul doit reussir.
    const results = await Promise.allSettled([attempt(70), attempt(70)]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.balanceCache.toNumber()).toBe(30);
    expect(updated.balanceCache.toNumber()).toBeGreaterThanOrEqual(0);
  });

  it("WalletService.reconcileBalance detecte une coherence entre le cache et le ledger", async () => {
    const user = await createUser({ username: "erin", email: "erin@test.local", balance: 200 });
    const result = await WalletService.reconcileBalance(user.id);
    expect(result.consistent).toBe(true);
    expect(result.cacheBalance.toNumber()).toBe(200);
  });
});
