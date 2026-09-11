"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface SportWithCount {
  id: string;
  key: string;
  name: string;
  _count: { competitions: number };
}

export default function SportsPage() {
  const [sports, setSports] = useState<SportWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ sports: SportWithCount[] }>("/api/sports")
      .then((res) => setSports(res.sports))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Sports</h1>
      {loading && <p className="text-kanio-muted">Chargement...</p>}
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {sports.map((s) => (
          <Link key={s.id} href={`/events?sport=${s.key}`} className="card p-5 hover:border-kanio-accent transition">
            <h2 className="font-semibold text-lg">{s.name}</h2>
            <p className="text-sm text-kanio-muted">{s._count.competitions} competition(s)</p>
          </Link>
        ))}
      </div>
      {!loading && sports.length === 0 && <p className="text-kanio-muted">Aucun sport disponible pour le moment.</p>}
    </div>
  );
}
