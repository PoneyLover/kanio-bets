"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatKan } from "@/lib/format";
import type { LeaderboardRow } from "@/lib/types";

const CRITERIA = [
  { value: "balance", label: "Solde" },
  { value: "profit", label: "Gains cumules" },
  { value: "wins", label: "Paris gagnants" },
  { value: "roi", label: "ROI virtuel" },
] as const;

export default function LeaderboardPage() {
  const [criteria, setCriteria] = useState<(typeof CRITERIA)[number]["value"]>("balance");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ leaderboard: LeaderboardRow[] }>(`/api/leaderboard?criteria=${criteria}`)
      .then((res) => setRows(res.leaderboard))
      .finally(() => setLoading(false));
  }, [criteria]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Classement des joueurs</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {CRITERIA.map((c) => (
          <button
            key={c.value}
            onClick={() => setCriteria(c.value)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              criteria === c.value ? "bg-kanio-accent text-kanio-bg border-kanio-accent" : "border-kanio-border text-kanio-muted"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {criteria === "roi" && (
        <p className="text-xs text-kanio-muted mb-3">
          Seuls les joueurs ayant regle au moins 3 paris apparaissent dans ce classement (protection contre les statistiques
          non significatives).
        </p>
      )}

      {loading && <p className="text-kanio-muted">Chargement...</p>}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-kanio-surface2 text-kanio-muted text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">#</th>
              <th className="text-left px-4 py-2">Joueur</th>
              <th className="text-right px-4 py-2">
                {criteria === "balance" && "Solde"}
                {criteria === "profit" && "Gains nets"}
                {criteria === "wins" && "Paris gagnes"}
                {criteria === "roi" && "ROI"}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.userId} className="border-t border-kanio-border">
                <td className="px-4 py-2 text-kanio-muted">{i + 1}</td>
                <td className="px-4 py-2 font-medium">{row.username}</td>
                <td className="px-4 py-2 text-right font-semibold">
                  {criteria === "balance" && formatKan(row.balance ?? 0)}
                  {criteria === "profit" && formatKan(row.netProfit ?? 0)}
                  {criteria === "wins" && row.wins}
                  {criteria === "roi" && `${((row.roi ?? 0) * 100).toFixed(1)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && <p className="text-kanio-muted p-4">Aucune donnee pour ce classement.</p>}
      </div>
    </div>
  );
}
