"use client";

import { useState } from "react";
import { useBetSlip } from "@/context/BetSlipContext";
import { useAuth, isApiError } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatKan, formatOdds } from "@/lib/format";
import type { Bet } from "@/lib/types";

export function BetSlip() {
  const { selection, setSelection } = useBetSlip();
  const { user, refreshUser } = useAuth();
  const [stake, setStake] = useState<string>("10");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!selection) return null;

  const stakeNumber = Number(stake) || 0;
  const potentialPayout = stakeNumber * selection.odds;

  async function handleSubmit() {
    setError(null);
    setSuccess(null);

    if (!user) {
      setError("Connectez-vous pour placer un pari.");
      return;
    }
    if (stakeNumber <= 0) {
      setError("La mise doit etre superieure a 0.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post<{ bet: Bet }>("/api/bets", { selectionId: selection!.selectionId, stake: stakeNumber });
      setSuccess(`Pari place : ${formatKan(res.bet.stake)} sur "${res.bet.selections[0]?.selectionLabel}" - gain potentiel ${formatKan(res.bet.potentialPayout)}`);
      await refreshUser();
      setTimeout(() => {
        setSelection(null);
        setSuccess(null);
      }, 2500);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Erreur lors du placement du pari");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-kanio-border bg-kanio-surface p-4 shadow-2xl lg:static lg:z-auto lg:w-80 lg:rounded-xl lg:border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-kanio-text">Ticket de pari</h3>
        <button onClick={() => setSelection(null)} className="text-kanio-muted hover:text-kanio-text text-sm">
          Fermer
        </button>
      </div>

      <div className="rounded-lg bg-kanio-surface2 p-3 mb-3">
        <p className="text-xs text-kanio-muted">{selection.eventLabel}</p>
        <p className="text-sm text-kanio-muted">{selection.marketName}</p>
        <div className="flex justify-between items-center mt-1">
          <span className="font-medium text-kanio-text">{selection.label}</span>
          <span className="font-bold text-kanio-accent">{formatOdds(selection.odds)}</span>
        </div>
      </div>

      <label className="text-xs text-kanio-muted mb-1 block">Mise (KAN)</label>
      <input
        type="number"
        min={1}
        step="0.01"
        className="input w-full mb-3"
        value={stake}
        onChange={(e) => setStake(e.target.value)}
      />

      <div className="flex justify-between text-sm mb-3">
        <span className="text-kanio-muted">Gain potentiel</span>
        <span className="font-semibold text-kanio-win">{formatKan(potentialPayout || 0)}</span>
      </div>

      {user && (
        <p className="text-xs text-kanio-muted mb-2">Solde disponible : {formatKan(user.balance)}</p>
      )}

      {error && <p className="text-sm text-kanio-loss mb-2">{error}</p>}
      {success && <p className="text-sm text-kanio-win mb-2">{success}</p>}

      <button className="btn-primary w-full" disabled={submitting} onClick={handleSubmit}>
        {submitting ? "Placement..." : "Valider le pari"}
      </button>
    </div>
  );
}
