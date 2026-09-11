"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { OddsButton } from "@/components/OddsButton";
import { formatDateTime } from "@/lib/format";
import type { EventItem } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "A venir",
  OPEN: "Ouvert aux paris",
  SUSPENDED: "Suspendu",
  CLOSED: "Ferme",
  FINISHED: "Termine",
  CANCELLED: "Annule",
};

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ event: EventItem }>(`/api/events/${params.id}`)
      .then((res) => setEvent(res.event))
      .catch(() => setError("Evenement introuvable"))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <p className="text-kanio-muted">Chargement...</p>;
  if (error || !event) return <p className="text-kanio-loss">{error ?? "Evenement introuvable"}</p>;

  const eventLabel = `${event.homeParticipant.name} vs ${event.awayParticipant.name}`;

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <p className="text-xs text-kanio-muted">
          {event.competition.sport.name} - {event.competition.name}
        </p>
        <h1 className="text-2xl font-bold">{eventLabel}</h1>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-sm text-kanio-muted">{formatDateTime(event.startTime)}</p>
          <span className="text-[11px] px-2 py-1 rounded-full border border-kanio-border text-kanio-muted">
            {STATUS_LABELS[event.status] ?? event.status}
          </span>
        </div>
        {event.resultPayload && (
          <p className="mt-2 text-lg font-bold">
            Score final : {event.resultPayload.homeScore} - {event.resultPayload.awayScore}
          </p>
        )}
      </div>

      {event.markets.map((market) => (
        <div key={market.id} className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">{market.name}</h2>
            {market.status !== "OPEN" && (
              <span className="text-[11px] px-2 py-1 rounded-full border border-kanio-border text-kanio-muted">
                {market.status}
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {market.selections.map((sel) => (
              <OddsButton
                key={sel.id}
                selection={sel}
                marketName={market.name}
                eventLabel={eventLabel}
                disabled={market.status !== "OPEN" || event.status !== "OPEN"}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
