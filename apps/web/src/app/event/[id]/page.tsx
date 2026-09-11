"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { OddsButton } from "@/components/OddsButton";
import { formatDateTime, formatKan, formatOdds } from "@/lib/format";
import type { EventItem, PublicBet } from "@/lib/types";

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
  const [bets, setBets] = useState<PublicBet[]>([]);
  const [betsLoading, setBetsLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ event: EventItem }>(`/api/events/${params.id}`)
      .then((res) => setEvent(res.event))
      .catch(() => setError("Evenement introuvable"))
      .finally(() => setLoading(false));

    api
      .get<{ bets: PublicBet[] }>(`/api/bets/public?eventId=${params.id}`)
      .then((res) => setBets(res.bets))
      .finally(() => setBetsLoading(false));
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

      <div className="card p-5">
        <h2 className="font-semibold mb-3">Paris des joueurs sur cet evenement</h2>
        {betsLoading && <p className="text-kanio-muted text-sm">Chargement...</p>}
        {!betsLoading && bets.length === 0 && (
          <p className="text-kanio-muted text-sm">Aucun pari place sur cet evenement pour le moment.</p>
        )}
        <div className="space-y-2">
          {bets.map((bet) => {
            const sel = bet.selections[0];
            return (
              <div key={bet.id} className="flex items-center justify-between gap-3 text-sm border-t border-kanio-border pt-2 first:border-t-0 first:pt-0">
                <div>
                  <span className="font-medium">{bet.username}</span>{" "}
                  <span className="text-kanio-muted">
                    a parie sur {sel?.selectionLabel} ({sel?.marketName}) a la cote {formatOdds(sel?.oddsTaken ?? bet.totalOdds)}
                  </span>
                </div>
                <span className="font-semibold whitespace-nowrap">{formatKan(bet.stake)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
