"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatDateTime, formatKan, formatOdds } from "@/lib/format";
import type { Bet, BetStatus } from "@/lib/types";

const TABS: { value: BetStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Tous" },
  { value: "PENDING", label: "En cours" },
  { value: "WON", label: "Gagnes" },
  { value: "LOST", label: "Perdus" },
  { value: "REFUNDED", label: "Rembourses" },
];

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

export default function BetsPage() {
  const { user, loading: authLoading } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [tab, setTab] = useState<BetStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const qs = tab !== "ALL" ? `?status=${tab}` : "";
    api
      .get<{ bets: Bet[] }>(`/api/bets${qs}`)
      .then((res) => setBets(res.bets))
      .finally(() => setLoading(false));
  }, [tab, user]);

  if (authLoading) return null;
  if (!user) return <p className="text-kanio-muted">Connecte-toi pour voir tes paris.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Mes paris</h1>
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              tab === t.value ? "bg-kanio-accent text-kanio-bg border-kanio-accent" : "border-kanio-border text-kanio-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

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
                  <p className="text-xs text-kanio-muted mt-1">{formatDateTime(bet.placedAt)}</p>
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
