import Link from "next/link";
import { OddsButton } from "./OddsButton";
import { formatDateTime } from "@/lib/format";
import type { EventItem } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "A venir",
  OPEN: "Ouvert",
  SUSPENDED: "Suspendu",
  CLOSED: "Ferme",
  FINISHED: "Termine",
  CANCELLED: "Annule",
};

export function EventCard({ event }: { event: EventItem }) {
  const mainMarket = event.markets.find((m) => m.type === "MATCH_WINNER") ?? event.markets[0];
  const eventLabel = `${event.homeParticipant.name} vs ${event.awayParticipant.name}`;
  const bettable = event.status === "OPEN";

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-kanio-muted">
            {event.competition.sport.name} - {event.competition.name}
          </p>
          <Link href={`/event/${event.id}`} className="font-semibold hover:text-kanio-accent">
            {eventLabel}
          </Link>
          <p className="text-xs text-kanio-muted">{formatDateTime(event.startTime)}</p>
        </div>
        <span
          className={`text-[11px] px-2 py-1 rounded-full border ${
            bettable ? "border-kanio-win text-kanio-win" : "border-kanio-border text-kanio-muted"
          }`}
        >
          {STATUS_LABELS[event.status] ?? event.status}
        </span>
      </div>

      {mainMarket && (
        <div className="flex gap-2 flex-wrap">
          {mainMarket.selections.map((sel) => (
            <OddsButton key={sel.id} selection={sel} marketName={mainMarket.name} eventLabel={eventLabel} disabled={!bettable} />
          ))}
        </div>
      )}

      {event.markets.length > 1 && (
        <Link href={`/event/${event.id}`} className="text-xs text-kanio-accent mt-3 inline-block">
          + {event.markets.length - 1} autre(s) marche(s)
        </Link>
      )}
    </div>
  );
}
