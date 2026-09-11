"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatKan } from "@/lib/format";
import type { PublicUser } from "@/lib/types";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await api.get<{ users: PublicUser[] }>(`/api/admin/users${qs}`);
    setUsers(res.users);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          className="input flex-1"
          placeholder="Rechercher par username ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <button className="btn-secondary" onClick={load}>
          Rechercher
        </button>
      </div>

      {loading && <p className="text-kanio-muted">Chargement...</p>}

      <div className="space-y-2">
        {users.map((u) => (
          <UserRow key={u.id} user={u} expanded={expandedId === u.id} onToggle={() => setExpandedId(expandedId === u.id ? null : u.id)} onChanged={load} />
        ))}
      </div>
    </div>
  );
}

function UserRow({
  user,
  expanded,
  onToggle,
  onChanged,
}: {
  user: PublicUser;
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function act(action: "suspend" | "reactivate" | "credit" | "debit") {
    setError(null);
    setBusy(true);
    try {
      if (action === "suspend" || action === "debit" || action === "credit") {
        if (!reason || reason.length < 5) {
          setError("Une justification d'au moins 5 caracteres est obligatoire.");
          setBusy(false);
          return;
        }
      }
      if (action === "suspend") await api.post(`/api/admin/users/${user.id}/suspend`, { reason });
      if (action === "reactivate") await api.post(`/api/admin/users/${user.id}/reactivate`);
      if (action === "credit") await api.post(`/api/admin/users/${user.id}/credit`, { amount: Number(amount), reason });
      if (action === "debit") await api.post(`/api/admin/users/${user.id}/debit`, { amount: Number(amount), reason });
      setAmount("");
      setReason("");
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div>
          <p className="font-medium">
            {user.username} <span className="text-kanio-muted text-sm">({user.email})</span>
          </p>
          <p className="text-xs text-kanio-muted">
            {user.role} - {user.status === "ACTIVE" ? "Actif" : "Suspendu"} - Solde : {formatKan(user.balance)}
          </p>
        </div>
        <span className="text-kanio-muted text-sm">{expanded ? "Fermer" : "Gerer"}</span>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-kanio-border space-y-3">
          <div className="flex gap-2 flex-wrap">
            {user.status === "ACTIVE" ? (
              <button className="btn-secondary text-sm" disabled={busy} onClick={() => act("suspend")}>
                Suspendre
              </button>
            ) : (
              <button className="btn-secondary text-sm" disabled={busy} onClick={() => act("reactivate")}>
                Reactiver
              </button>
            )}
          </div>

          <div className="grid sm:grid-cols-[120px_1fr_auto_auto] gap-2 items-start">
            <input type="number" placeholder="Montant" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <input
              placeholder="Justification (obligatoire)"
              className="input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <button className="btn-primary text-sm" disabled={busy || !amount} onClick={() => act("credit")}>
              Crediter
            </button>
            <button className="btn-secondary text-sm" disabled={busy || !amount} onClick={() => act("debit")}>
              Debiter
            </button>
          </div>

          {error && <p className="text-sm text-kanio-loss">{error}</p>}
        </div>
      )}
    </div>
  );
}
