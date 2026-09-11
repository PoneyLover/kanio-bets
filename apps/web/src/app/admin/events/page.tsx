"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { EventItem } from "@/lib/types";

interface Options {
  competitions: { id: string; name: string; sport: { name: string } }[];
  participants: { id: string; name: string }[];
  sports: { id: string; name: string }[];
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [options, setOptions] = useState<Options | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const [eventsRes, optionsRes] = await Promise.all([
      api.get<{ events: EventItem[] }>("/api/admin/events"),
      api.get<Options>("/api/admin/meta/options"),
    ]);
    setEvents(eventsRes.events);
    setOptions(optionsRes);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function transition(id: string, action: "open" | "suspend" | "close") {
    await api.post(`/api/admin/events/${id}/${action}`);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">Evenements</h2>
        <button className="btn-primary text-sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Annuler" : "+ Nouvel evenement"}
        </button>
      </div>

      {showForm && options && (
        <CreateEventForm
          options={options}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {loading && <p className="text-kanio-muted">Chargement...</p>}

      <div className="space-y-2 mt-4">
        {events.map((ev) => (
          <div key={ev.id} className="card p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-xs text-kanio-muted">
                  {ev.competition.sport.name} - {ev.competition.name}
                </p>
                <Link href={`/admin/events/${ev.id}`} className="font-medium hover:text-kanio-accent">
                  {ev.homeParticipant.name} vs {ev.awayParticipant.name}
                </Link>
                <p className="text-xs text-kanio-muted">
                  {formatDateTime(ev.startTime)} - {ev.status}
                </p>
              </div>
              <div className="flex gap-2">
                {ev.status !== "OPEN" && ev.status !== "FINISHED" && ev.status !== "CANCELLED" && (
                  <button className="btn-secondary text-xs" onClick={() => transition(ev.id, "open")}>
                    Ouvrir
                  </button>
                )}
                {ev.status === "OPEN" && (
                  <button className="btn-secondary text-xs" onClick={() => transition(ev.id, "suspend")}>
                    Suspendre
                  </button>
                )}
                {(ev.status === "OPEN" || ev.status === "SUSPENDED") && (
                  <button className="btn-secondary text-xs" onClick={() => transition(ev.id, "close")}>
                    Fermer
                  </button>
                )}
                <Link href={`/admin/events/${ev.id}`} className="btn-secondary text-xs">
                  Gerer
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateEventForm({ options, onCreated }: { options: Options; onCreated: () => void }) {
  const [competitionId, setCompetitionId] = useState(options.competitions[0]?.id ?? "");
  const [homeParticipantId, setHomeParticipantId] = useState(options.participants[0]?.id ?? "");
  const [awayParticipantId, setAwayParticipantId] = useState(options.participants[1]?.id ?? "");
  const [startTime, setStartTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    if (homeParticipantId === awayParticipantId) {
      setError("Les deux equipes doivent etre differentes.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/api/admin/events", {
        competitionId,
        homeParticipantId,
        awayParticipantId,
        startTime: new Date(startTime).toISOString(),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur lors de la creation");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4 mb-4 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-kanio-muted block mb-1">Competition</label>
          <select className="input w-full" value={competitionId} onChange={(e) => setCompetitionId(e.target.value)}>
            {options.competitions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.sport.name} - {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-kanio-muted block mb-1">Date/heure</label>
          <input type="datetime-local" className="input w-full" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-kanio-muted block mb-1">Equipe domicile</label>
          <select className="input w-full" value={homeParticipantId} onChange={(e) => setHomeParticipantId(e.target.value)}>
            {options.participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-kanio-muted block mb-1">Equipe exterieur</label>
          <select className="input w-full" value={awayParticipantId} onChange={(e) => setAwayParticipantId(e.target.value)}>
            {options.participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="text-sm text-kanio-loss">{error}</p>}
      <button className="btn-primary" disabled={busy || !startTime} onClick={submit}>
        Creer l&apos;evenement
      </button>
    </div>
  );
}
