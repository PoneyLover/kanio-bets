"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

interface Sport {
  id: string;
  key: string;
  name: string;
}
interface Competition {
  id: string;
  name: string;
  country: string | null;
  sport: { id: string; name: string };
}
interface Participant {
  id: string;
  name: string;
  shortName: string | null;
}

export default function AdminCatalogPage() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);

  async function load() {
    const res = await api.get<{ sports: Sport[]; competitions: Competition[]; participants: Participant[] }>(
      "/api/admin/meta/options"
    );
    setSports(res.sports);
    setCompetitions(res.competitions);
    setParticipants(res.participants);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-8">
      <p className="text-sm text-kanio-muted -mt-2">
        Cree ici tout ce dont tu as besoin pour un evenement sur-mesure (ex: un tournoi d&apos;echecs entre amis) :
        d&apos;abord un sport, puis une competition rattachee, puis les participants (des personnes ou des equipes).
        Une fois crees, ils apparaissent dans le formulaire &quot;Nouvel evenement&quot; de l&apos;onglet Evenements,
        visible par tous comme n&apos;importe quel autre evenement.
      </p>

      <SportSection sports={sports} onCreated={load} />
      <CompetitionSection sports={sports} competitions={competitions} onCreated={load} />
      <ParticipantSection participants={participants} onCreated={load} />
    </div>
  );
}

function SportSection({ sports, onCreated }: { sports: Sport[]; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.post("/api/admin/meta/sports", { name: name.trim() });
      setName("");
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-3">Sports</h2>
      <div className="flex gap-2 mb-3">
        <input
          className="input flex-1"
          placeholder="Nom du sport (ex: Echecs)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button className="btn-primary" disabled={busy || !name.trim()} onClick={submit}>
          Ajouter
        </button>
      </div>
      {error && <p className="text-sm text-kanio-loss mb-2">{error}</p>}
      <div className="flex gap-2 flex-wrap">
        {sports.map((s) => (
          <span key={s.id} className="text-xs px-2 py-1 rounded-full border border-kanio-border text-kanio-muted">
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function CompetitionSection({
  sports,
  competitions,
  onCreated,
}: {
  sports: Sport[];
  competitions: Competition[];
  onCreated: () => void;
}) {
  const [sportId, setSportId] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!sportId && sports.length > 0) setSportId(sports[0].id);
  }, [sports, sportId]);

  async function submit() {
    setError(null);
    if (!name.trim() || !sportId) return;
    setBusy(true);
    try {
      await api.post("/api/admin/meta/competitions", { sportId, name: name.trim() });
      setName("");
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-3">Competitions</h2>
      {sports.length === 0 ? (
        <p className="text-sm text-kanio-muted">Cree d&apos;abord un sport ci-dessus.</p>
      ) : (
        <div className="flex gap-2 mb-3 flex-wrap">
          <select className="input" value={sportId} onChange={(e) => setSportId(e.target.value)}>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            className="input flex-1"
            placeholder="Nom de la competition (ex: Tournoi entre amis)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <button className="btn-primary" disabled={busy || !name.trim()} onClick={submit}>
            Ajouter
          </button>
        </div>
      )}
      {error && <p className="text-sm text-kanio-loss mb-2">{error}</p>}
      <div className="flex gap-2 flex-wrap">
        {competitions.map((c) => (
          <span key={c.id} className="text-xs px-2 py-1 rounded-full border border-kanio-border text-kanio-muted">
            {c.sport.name} - {c.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function ParticipantSection({ participants, onCreated }: { participants: Participant[]; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.post("/api/admin/meta/participants", { name: name.trim() });
      setName("");
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-3">Participants (equipes ou personnes)</h2>
      <div className="flex gap-2 mb-3">
        <input
          className="input flex-1"
          placeholder="Nom (ex: Julien, ou une equipe)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button className="btn-primary" disabled={busy || !name.trim()} onClick={submit}>
          Ajouter
        </button>
      </div>
      {error && <p className="text-sm text-kanio-loss mb-2">{error}</p>}
      <div className="flex gap-2 flex-wrap">
        {participants.map((p) => (
          <span key={p.id} className="text-xs px-2 py-1 rounded-full border border-kanio-border text-kanio-muted">
            {p.name}
          </span>
        ))}
      </div>
    </div>
  );
}
