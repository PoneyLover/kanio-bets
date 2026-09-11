"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, formatOdds } from "@/lib/format";
import type { EventItem } from "@/lib/types";

export default function AdminEventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    try {
      const res = await api.get<{ event: EventItem }>(`/api/events/${params.id}`);
      setEvent(res.event);
    } catch {
      setError("Evenement introuvable");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (error) return <p className="text-kanio-loss">{error}</p>;
  if (!event) return <p className="text-kanio-muted">Chargement...</p>;

  const canSettle = event.status !== "FINISHED" && event.status !== "CANCELLED";
  const canCancel = event.status !== "FINISHED" && event.status !== "CANCELLED";

  return (
    <div className="space-y-6">
      <button className="text-sm text-kanio-accent" onClick={() => router.push("/admin/events")}>
        &larr; Retour
      </button>

      <div className="card p-5">
        <p className="text-xs text-kanio-muted">
          {event.competition.sport.name} - {event.competition.name}
        </p>
        <h1 className="text-2xl font-bold">
          {event.homeParticipant.name} vs {event.awayParticipant.name}
        </h1>
        <p className="text-sm text-kanio-muted">
          {formatDateTime(event.startTime)} - Statut : {event.status}
        </p>
        {event.resultPayload && (
          <p className="mt-2 font-semibold">
            Score : {event.resultPayload.homeScore} - {event.resultPayload.awayScore}
          </p>
        )}
      </div>

      {message && <p className="text-sm text-kanio-win">{message}</p>}

      {event.markets.map((market) => (
        <div key={market.id} className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">
              {market.name} <span className="text-xs text-kanio-muted">({market.type})</span>
            </h2>
            <span className="text-[11px] px-2 py-1 rounded-full border border-kanio-border text-kanio-muted">
              {market.status}
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {market.selections.map((s) => (
              <div key={s.id} className="rounded-lg border border-kanio-border bg-kanio-surface2 px-3 py-2 text-center">
                <p className="text-xs text-kanio-muted">{s.label}</p>
                <p className="font-semibold">{formatOdds(s.currentOdds)}</p>
                <p className="text-[10px] text-kanio-muted">mise : {Number(s.totalStaked).toFixed(0)} KAN</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      <AddMarketForm
        eventId={event.id}
        homeLabel={event.homeParticipant.name}
        awayLabel={event.awayParticipant.name}
        onCreated={load}
      />

      {canSettle && <SettleForm eventId={event.id} onDone={(m) => { setMessage(m); load(); }} />}
      {canCancel && <CancelForm eventId={event.id} onDone={(m) => { setMessage(m); load(); }} />}
    </div>
  );
}

function SettleForm({ eventId, onDone }: { eventId: string; onDone: (msg: string) => void }) {
  const [homeScore, setHomeScore] = useState("0");
  const [awayScore, setAwayScore] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const res = await api.post<{ wonCount: number; lostCount: number; refundedCount: number }>(
        `/api/admin/events/${eventId}/settle`,
        { homeScore: Number(homeScore), awayScore: Number(awayScore) }
      );
      onDone(`Evenement regle : ${res.wonCount} pari(s) gagnant(s), ${res.lostCount} perdant(s), ${res.refundedCount} rembourse(s).`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur lors du reglement");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-3">Regler l&apos;evenement (saisir le resultat)</h2>
      <div className="flex items-end gap-3">
        <div>
          <label className="text-xs text-kanio-muted block mb-1">Score domicile</label>
          <input type="number" min={0} className="input w-24" value={homeScore} onChange={(e) => setHomeScore(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-kanio-muted block mb-1">Score exterieur</label>
          <input type="number" min={0} className="input w-24" value={awayScore} onChange={(e) => setAwayScore(e.target.value)} />
        </div>
        <button className="btn-primary" disabled={busy} onClick={submit}>
          Regler
        </button>
      </div>
      {error && <p className="text-sm text-kanio-loss mt-2">{error}</p>}
    </div>
  );
}

function CancelForm({ eventId, onDone }: { eventId: string; onDone: (msg: string) => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    if (reason.length < 5) {
      setError("Justification d'au moins 5 caracteres requise.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<{ refundedCount: number }>(`/api/admin/events/${eventId}/cancel`, { reason });
      onDone(`Evenement annule : ${res.refundedCount} pari(s) rembourse(s) integralement.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur lors de l'annulation");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-3 text-kanio-loss">Annuler l&apos;evenement</h2>
      <div className="flex gap-3">
        <input
          className="input flex-1"
          placeholder="Justification (obligatoire)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <button className="btn-secondary" disabled={busy} onClick={submit}>
          Annuler et rembourser
        </button>
      </div>
      {error && <p className="text-sm text-kanio-loss mt-2">{error}</p>}
    </div>
  );
}

function AddMarketForm({
  eventId,
  homeLabel,
  awayLabel,
  onCreated,
}: {
  eventId: string;
  homeLabel: string;
  awayLabel: string;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"MATCH_WINNER" | "OVER_UNDER">("MATCH_WINNER");
  const [allowDraw, setAllowDraw] = useState(true);
  const [line, setLine] = useState("2.5");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      if (type === "MATCH_WINNER") {
        const selections = [
          { label: homeLabel, outcomeKey: "HOME", odds: allowDraw ? 2.0 : 1.8 },
          ...(allowDraw ? [{ label: "Nul", outcomeKey: "DRAW", odds: 3.2 }] : []),
          { label: awayLabel, outcomeKey: "AWAY", odds: allowDraw ? 3.6 : 1.8 },
        ];
        await api.post(`/api/admin/events/${eventId}/markets`, {
          type: "MATCH_WINNER",
          name: "Vainqueur",
          selections,
        });
      } else {
        await api.post(`/api/admin/events/${eventId}/markets`, {
          type: "OVER_UNDER",
          name: `Total buts +/- ${line}`,
          line: Number(line),
          selections: [
            { label: `Plus de ${line} buts`, outcomeKey: "OVER", odds: 1.9 },
            { label: `Moins de ${line} buts`, outcomeKey: "UNDER", odds: 1.9 },
          ],
        });
      }
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="btn-secondary" onClick={() => setOpen(true)}>
        + Ajouter un marche
      </button>
    );
  }

  return (
    <div className="card p-5 space-y-3">
      <h2 className="font-semibold">Nouveau marche</h2>
      <select className="input w-full" value={type} onChange={(e) => setType(e.target.value as "MATCH_WINNER" | "OVER_UNDER")}>
        <option value="MATCH_WINNER">Vainqueur</option>
        <option value="OVER_UNDER">Total buts (Over/Under)</option>
      </select>
      {type === "MATCH_WINNER" && (
        <label className="flex items-center gap-2 text-sm text-kanio-muted">
          <input type="checkbox" checked={allowDraw} onChange={(e) => setAllowDraw(e.target.checked)} />
          Match nul possible (decoche pour un duel sans egalite, ex: pile ou face)
        </label>
      )}
      {type === "OVER_UNDER" && (
        <input className="input w-32" value={line} onChange={(e) => setLine(e.target.value)} placeholder="Ligne (ex: 2.5)" />
      )}
      {error && <p className="text-sm text-kanio-loss">{error}</p>}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={busy} onClick={submit}>
          Creer
        </button>
        <button className="btn-secondary" onClick={() => setOpen(false)}>
          Annuler
        </button>
      </div>
    </div>
  );
}
