"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDateTime, formatKan, formatOdds } from "@/lib/format";
import type { BetStatus, PublicBet } from "@/lib/types";

const STATUS_STYLE: Record<BetStatus, string> = {
  PENDING: "text-kanio-accent border-kanio-accent",
  WON: "text-kanio-win border-kanio-win",
  LOST: "text-kanio-loss border-kanio-loss",
  REFUNDED: "text-kanio-muted border-kanio-muted",
  CANCELLED: "text-kanio-muted border-kanio-muted",
};

const STATUS_LABEL: Record<BetStatus, string> = {
  PENDING: "En cours",
  WON: "Gagne",
  LOST: "Perdu",
  REFUNDED: "Rembourse",
  CANCELLED: "Annule",
};

export default function ActivitePage() {
  const [bets, setBets] = useState<PublicBet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ bets: PublicBet[] }>("/api/bets/public")
      .then((res) => setBets(res.bets))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Activite de la communaute</h1>
      <p className="text-sm text-kanio-muted mb-6">Tous les paris places sur KANIO, avec la mise de chaque joueur.</p>

      {loading && <p className="text-kanio-muted">Chargement...</p>}

      <div className="space-y-3">
        {bets.map((bet) => {
          const sel = bet.selections[0];
          return (
            <div key={bet.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-kanio-muted">{sel?.eventLabel}</p>
                  <p className="font-medium">
                    {sel?.selectionLabel} <span className="text-kanio-muted">({sel?.marketName})</span>
                  </p>
                  <p className="text-xs text-kanio-muted mt-1">
                    {bet.username} - {formatDateTime(bet.placedAt)}
                  </p>
                </div>
                <span className={`text-[11px] px-2 py-1 rounded-full border ${STATUS_STYLE[bet.status]}`}>
                  {STATUS_LABEL[bet.status]}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span>
                  Mise : <strong>{formatKan(bet.stake)}</strong>
                </span>
                <span>
                  Cote : <strong>{formatOdds(bet.totalOdds)}</strong>
                </span>
                <span>
                  {bet.status === "WON" || bet.status === "REFUNDED" ? "Gain" : "Gain potentiel"} :{" "}
                  <strong className={bet.status === "WON" ? "text-kanio-win" : ""}>
                    {formatKan(bet.payoutAmount ?? bet.potentialPayout)}
                  </strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && bets.length === 0 && <p className="text-kanio-muted">Aucun pari pour le moment.</p>}
    </div>
  );
}
