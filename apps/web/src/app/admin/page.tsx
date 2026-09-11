"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatKan } from "@/lib/format";

interface DashboardData {
  usersCount: number;
  activeUsersCount: number;
  betsCount: number;
  wonBetsCount: number;
  lostBetsCount: number;
  pendingBetsCount: number;
  totalKanioVolume: string;
  eventsPendingSettlement: number;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    api.get<DashboardData>("/api/admin/dashboard").then(setData);
  }, []);

  if (!data) return <p className="text-kanio-muted">Chargement...</p>;

  const cards = [
    { label: "Utilisateurs", value: data.usersCount, sub: `${data.activeUsersCount} actifs` },
    { label: "Volume KANIO joue", value: formatKan(data.totalKanioVolume) },
    { label: "Paris places", value: data.betsCount },
    { label: "Paris gagnants", value: data.wonBetsCount },
    { label: "Paris perdants", value: data.lostBetsCount },
    { label: "Paris en attente", value: data.pendingBetsCount },
    { label: "Evenements a regler", value: data.eventsPendingSettlement },
  ];

  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="card p-5">
          <p className="text-sm text-kanio-muted">{c.label}</p>
          <p className="text-2xl font-bold">{c.value}</p>
          {c.sub && <p className="text-xs text-kanio-muted">{c.sub}</p>}
        </div>
      ))}
    </div>
  );
}
