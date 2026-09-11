"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatDateTime, formatKan } from "@/lib/format";
import type { WalletTransaction } from "@/lib/types";

const TYPE_LABEL: Record<WalletTransaction["type"], string> = {
  INITIAL_BALANCE: "Solde initial",
  BET_PLACED: "Pari place",
  BET_WIN: "Gain de pari",
  BET_LOSS: "Pari perdu",
  BET_REFUND: "Remboursement",
  ADMIN_CREDIT: "Credit admin",
  ADMIN_DEBIT: "Debit admin",
  BONUS: "Bonus",
};

const CREDIT_TYPES = new Set(["INITIAL_BALANCE", "BET_WIN", "BET_REFUND", "ADMIN_CREDIT", "BONUS"]);

export default function WalletPage() {
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api
      .get<{ transactions: WalletTransaction[] }>("/api/wallet/transactions")
      .then((res) => setTransactions(res.transactions))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading) return null;
  if (!user) return <p className="text-kanio-muted">Connecte-toi pour voir ton portefeuille.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Mon portefeuille</h1>

      <div className="card p-6 mb-6">
        <p className="text-sm text-kanio-muted">Solde actuel</p>
        <p className="text-4xl font-black text-kanio-win">{formatKan(user.balance)}</p>
        <p className="text-xs text-kanio-muted mt-2">Monnaie 100% virtuelle, sans valeur reelle.</p>
      </div>

      <h2 className="font-semibold mb-3">Historique des transactions</h2>
      {loading && <p className="text-kanio-muted">Chargement...</p>}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-kanio-surface2 text-kanio-muted text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-left px-4 py-2">Type</th>
                <th className="text-left px-4 py-2">Description</th>
                <th className="text-right px-4 py-2">Montant</th>
                <th className="text-right px-4 py-2">Solde apres</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-t border-kanio-border">
                  <td className="px-4 py-2 text-kanio-muted whitespace-nowrap">{formatDateTime(tx.createdAt)}</td>
                  <td className="px-4 py-2">{TYPE_LABEL[tx.type]}</td>
                  <td className="px-4 py-2 text-kanio-muted">{tx.description}</td>
                  <td className={`px-4 py-2 text-right font-medium ${CREDIT_TYPES.has(tx.type) ? "text-kanio-win" : "text-kanio-loss"}`}>
                    {CREDIT_TYPES.has(tx.type) ? "+" : "-"}
                    {formatKan(tx.amount)}
                  </td>
                  <td className="px-4 py-2 text-right">{formatKan(tx.balanceAfter)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && transactions.length === 0 && (
          <p className="text-kanio-muted p-4 text-sm">Aucune transaction pour le moment.</p>
        )}
      </div>
    </div>
  );
}
